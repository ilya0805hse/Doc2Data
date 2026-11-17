"""Dependency checks and browser startup for the macOS double-click launcher."""
import importlib
import importlib.metadata
import json
import os
from pathlib import Path
import shutil
import socket
import sqlite3
import subprocess
import sys
import time
import urllib.request

ROOT = Path(__file__).resolve().parent.parent


def say(message):
    print(message, flush=True)


def check_dependencies():
    say('Checking Python libraries…')
    try:
        from pip._vendor.packaging.requirements import Requirement
    except ImportError:
        subprocess.run([sys.executable, '-m', 'ensurepip', '--upgrade'], check=True)
        from pip._vendor.packaging.requirements import Requirement
    missing = []
    for line in (ROOT / 'requirements.txt').read_text().splitlines():
        if not line.strip() or line.lstrip().startswith('#'):
            continue
        requirement = Requirement(line)
        if requirement.marker and not requirement.marker.evaluate():
            continue
        try:
            version = importlib.metadata.version(requirement.name)
            if version not in requirement.specifier:
                missing.append(line)
        except importlib.metadata.PackageNotFoundError:
            missing.append(line)
    if missing:
        say('Installing missing or incompatible libraries: ' + ', '.join(missing))
        subprocess.run([sys.executable, '-m', 'pip', 'install', '-r', str(ROOT / 'requirements.txt')], check=True)
    subprocess.run([sys.executable, '-m', 'pip', 'check'], check=True)
    for module in ('pypdf', 'docx', 'openpyxl', 'xlrd', 'pymupdf'):
        importlib.import_module(module)
    say('Python libraries are ready.')


def check_ocr():
    config = {}
    database = Path(os.environ.get('DOCTODATA_HOME', ROOT / '.data')).expanduser() / 'workspace.db'
    if database.exists():
        try:
            with sqlite3.connect(database.resolve().as_uri() + '?mode=ro', uri=True) as db:
                row = db.execute('SELECT value FROM settings WHERE id=1').fetchone()
                config = json.loads(row[0]) if row else {}
        except (sqlite3.Error, ValueError):
            say('Could not read OCR preferences; checking the default English language.')
    if not config.get('ocr_enabled', True):
        say('OCR is disabled in your settings.')
        return
    brew = shutil.which('brew')
    if not shutil.which('tesseract') and brew:
        say('Installing Tesseract for local OCR…')
        subprocess.run([brew, 'install', 'tesseract'], check=True)
    executable = shutil.which('tesseract')
    if not executable:
        say('Optional OCR is unavailable. Install Homebrew and reopen this launcher to install Tesseract automatically.')
        return
    requested = set(config.get('ocr_languages', 'eng').split('+'))
    def languages():
        result = subprocess.run([executable, '--list-langs'], capture_output=True, text=True, check=True, timeout=15)
        return set(result.stdout.splitlines()[1:])
    missing = requested - languages()
    if missing and brew:
        say('Installing OCR language packs for: ' + ', '.join(sorted(missing)))
        subprocess.run([brew, 'install', 'tesseract-lang'], check=True)
        missing = requested - languages()
    if missing:
        say('OCR language packs still missing: ' + ', '.join(sorted(missing)) + '. Check Model providers → OCR settings.')
    else:
        say('OCR is ready: ' + ', '.join(sorted(requested)))


def is_doctodata(url):
    # Ignore system proxies for the local readiness check.
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
    try:
        with opener.open(url, timeout=1) as response:
            return b'<title>DocToData' in response.read(4096)
    except (OSError, ValueError):
        return False


def main():
    os.chdir(ROOT)
    check_dependencies()
    check_ocr()
    if '--check-only' in sys.argv:
        return
    port = int(os.environ.get('PORT', '8000'))
    if not 1 <= port <= 65535:
        raise ValueError('PORT must be between 1 and 65535.')
    url = f'http://127.0.0.1:{port}'
    if is_doctodata(url):
        say('DocToData is already running. Opening your browser…')
        subprocess.run(['/usr/bin/open', url], check=True)
        return
    with socket.socket() as probe:
        if probe.connect_ex(('127.0.0.1', port)) == 0:
            raise RuntimeError(f'Port {port} is used by another application. Set PORT to a free port and try again.')
    say('Starting DocToData. Keep this Terminal window open; press Control+C to stop.')
    process = subprocess.Popen([sys.executable, '-u', str(ROOT / 'server.py')], cwd=ROOT)
    try:
        deadline = time.monotonic() + 30
        while time.monotonic() < deadline:
            if process.poll() is not None:
                raise RuntimeError(f'Server exited with code {process.returncode}. See its message above.')
            if is_doctodata(url):
                say('Ready: ' + url)
                subprocess.run(['/usr/bin/open', url], check=True)
                process.wait()
                return
            time.sleep(.25)
        raise RuntimeError('Server did not become ready within 30 seconds.')
    finally:
        if process.poll() is None:
            process.terminate()
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait()


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        say('\nDocToData stopped.')
    except Exception as error:
        say('\nCould not start DocToData: ' + str(error))
        sys.exit(1)
