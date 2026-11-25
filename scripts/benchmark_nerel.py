#!/usr/bin/env python3
"""Evaluate DocToData over the local NEREL_bench test split."""
import argparse
import base64
from collections import Counter
import json
from pathlib import Path
import re
import time
import unicodedata
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
DATASET = ROOT / "datasets" / "NEREL_bench"
TASKS = ("entity_recognition", "relation_extraction", "entity_definition", "relation_definition")
LIST_TASKS = TASKS[:2]
EMPTY_RELATIONS = "связанных сущностей нет"


def api(base, path, payload=None):
    request = Request(base + path)
    if payload is not None:
        request.data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        request.add_header("Content-Type", "application/json")
    try:
        with urlopen(request, timeout=30) as response:
            return json.load(response)
    except HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"{path}: HTTP {error.code}: {detail}") from error
    except URLError as error:
        raise RuntimeError(f"{path}: {error.reason}") from error


def wait_for(base, path, timeout):
    deadline = time.monotonic() + timeout
    while True:
        result = api(base, path)
        if result["status"] == "complete":
            return result
        if result["status"] != "running":
            detail = result.get("error") or result.get("detail")
            raise RuntimeError(f"{path}: {result['status']}: {detail}")
        if time.monotonic() >= deadline:
            raise TimeoutError(f"Timed out polling {path}; the job may still be running.")
        time.sleep(0.5)


def extract(base, workspace, task, index, example, timeout):
    context = json.loads(example["context"])
    source = context["source_text"]
    context["source_text"] = "[См. текст в приложенном документе]"
    prompt = example["instruction"].format(**context)
    if task in LIST_TASKS:
        output = ("Верните таблицу с единственным столбцом answer. "
                  "Одна сущность в строке. Если сущностей нет, верните пустую таблицу.")
    else:
        output = ("Верните таблицу с единственным столбцом answer и одной строкой, "
                  "содержащей полное объяснение.")
    prompt += "\n\nФормат DocToData взамен формата вывода выше. " + output

    title = f"{task}/{index}"
    session = api(base, "/api/sessions", {"workspace_id": workspace, "title": title})["id"]
    upload = api(base, "/api/documents", {
        "workspace_id": workspace,
        "name": f"{task}-{index}.txt",
        "data": base64.b64encode(source.encode("utf-8")).decode("ascii"),
    })["upload_id"]
    query = urlencode({"workspace_id": workspace})
    document = wait_for(base, f"/api/uploads/{upload}?{query}", timeout)["document_id"]
    run = api(base, "/api/runs", {
        "session_id": session,
        "document_ids": [document],
        "prompt": prompt,
        "processing_mode": "text",
    })["id"]
    return run, wait_for(base, f"/api/runs/{run}", timeout)["result"]


def read_answer(task, result):
    if [column.strip().casefold() for column in result["columns"]] != ["answer"]:
        raise ValueError("Expected exactly one answer column.")
    values = [row["values"][0] for row in result["rows"]]
    if any(value is None or not str(value).strip() for value in values):
        raise ValueError("Empty answer cell.")
    if task not in LIST_TASKS and len(values) != 1:
        raise ValueError("Expected one definition row.")
    return "\n".join(map(str, values))


def normalize(text):
    return " ".join(unicodedata.normalize("NFC", text).split())


def entities(task, text):
    items = {normalize(line) for line in text.splitlines() if line.strip()}
    if task == "relation_extraction" and normalize(text).casefold().rstrip(".") == EMPTY_RELATIONS:
        return set()
    return items


def ratio(numerator, denominator):
    return numerator / denominator if denominator else 0.0


def token_f1(expected, predicted):
    expected_tokens = Counter(re.findall(r"\w+", normalize(expected).casefold()))
    predicted_tokens = Counter(re.findall(r"\w+", normalize(predicted).casefold()))
    overlap = sum((expected_tokens & predicted_tokens).values())
    return ratio(2 * overlap, expected_tokens.total() + predicted_tokens.total())


def score(task, expected, predicted):
    if task in LIST_TASKS:
        gold = entities(task, expected)
        actual = entities(task, predicted) if predicted is not None else set()
        return dict(
            tp=len(gold & actual), fp=len(actual - gold), fn=len(gold - actual),
            exact_match=predicted is not None and actual == gold,
        )
    return dict(
        exact_match=predicted is not None and normalize(expected) == normalize(predicted),
        token_f1=token_f1(expected, predicted) if predicted is not None else 0.0,
    )


def summarize(task, counts):
    attempted = counts["attempted"]
    report = {
        "attempted": attempted,
        "scored": counts["scored"],
        "failures": attempted - counts["scored"],
        "exact_match": ratio(counts["exact_match"], attempted),
    }
    if task in LIST_TASKS:
        tp, fp, fn = (counts[key] for key in ("tp", "fp", "fn"))
        report.update(tp=tp, fp=fp, fn=fn, micro_precision=ratio(tp, tp + fp),
                      micro_recall=ratio(tp, tp + fn), micro_f1=ratio(2 * tp, 2 * tp + fp + fn))
    else:
        report["mean_token_f1"] = ratio(counts["token_f1"], attempted)
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", default="http://127.0.0.1:8000")
    parser.add_argument("--dataset", type=Path, default=DATASET)
    parser.add_argument("--task", choices=(*TASKS, "all"), default=TASKS[0])
    parser.add_argument("--limit", type=int, default=5, help="Per task; 0 evaluates all remaining rows.")
    parser.add_argument("--offset", type=int, default=0, help="Zero-based starting row in each task.")
    parser.add_argument("--timeout", type=float, default=300, help="Seconds to wait per upload or run.")
    parser.add_argument("--output", type=Path, required=True, help="New directory for JSONL and metrics.")
    args = parser.parse_args()
    if args.limit < 0 or args.offset < 0 or args.timeout <= 0:
        parser.error("limit and offset must be nonnegative; timeout must be positive")
    try:
        import pyarrow.parquet as parquet
    except ImportError:
        parser.exit(1, "Install the Parquet reader with: .venv/bin/python -m pip install pyarrow\n")

    tasks = TASKS if args.task == "all" else (args.task,)
    tables = {}
    for task in tasks:
        table = parquet.read_table(args.dataset / task / "test" / "0000.parquet")
        if args.offset >= len(table):
            parser.error(f"offset {args.offset} is outside {task} ({len(table)} rows)")
        tables[task] = table.slice(args.offset, args.limit or None)

    try:
        args.output.mkdir(parents=True, exist_ok=False)
    except FileExistsError:
        parser.error(f"Output path already exists: {args.output}. Choose a new path with --output.")
    base = args.base_url.rstrip("/")
    workspace = api(base, "/api/workspaces", {"name": f"NEREL_bench {args.output.name}"})["id"]
    report = {"workspace_id": workspace, "offset": args.offset, "limit": args.limit, "tasks": {}}
    models = set()
    interrupted = False
    with (args.output / "examples.jsonl").open("w", encoding="utf-8") as log:
        for task, table in tables.items():
            counts = Counter()
            for index, example in enumerate(table.to_pylist(), args.offset):
                record = {"task": task, "index": index, "expected": example["true_answer"]}
                predicted = None
                try:
                    run, result = extract(base, workspace, task, index, example, args.timeout)
                    record.update(run_id=run, result=result)
                    models.add((result.get("provider") or "", result.get("model") or ""))
                    predicted = read_answer(task, result)
                except TimeoutError as error:
                    record["error"] = str(error)
                    interrupted = True
                except (RuntimeError, ValueError) as error:
                    record["error"] = str(error)
                scores = score(task, record["expected"], predicted)
                record.update(predicted=predicted, scores=scores)
                log.write(json.dumps(record, ensure_ascii=False) + "\n")
                log.flush()
                counts.update(scores)
                counts["attempted"] += 1
                counts["scored"] += predicted is not None
                print(f"{task} [{index}] {record.get('error', 'OK')}", flush=True)
                if interrupted:
                    break
            report["tasks"][task] = summarize(task, counts)
            if interrupted:
                break
    report["interrupted"] = interrupted
    report["models"] = [{"provider": provider, "model": model} for provider, model in sorted(models)]
    summary = json.dumps(report, ensure_ascii=False, indent=2)
    (args.output / "metrics.json").write_text(summary + "\n", encoding="utf-8")
    print(summary)
    return int(any(task["failures"] for task in report["tasks"].values()))


if __name__ == "__main__":
    raise SystemExit(main())
