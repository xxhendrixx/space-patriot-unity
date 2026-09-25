"""Create allowlisted source and player archives."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import hashlib
import json

root = Path(__file__).resolve().parent.parent
out = root / 'releases'
out.mkdir(exist_ok=True)
files = [root / name for name in ['package.json', 'package-lock.json', 'README.md', '.gitignore']]
for directory in ['source', 'assets', 'vendor/user-engines', 'tests', 'docs']:
    files.extend(p for p in (root / directory).rglob('*') if p.is_file())
files.extend(root / 'scripts' / name for name in ['build.mjs', 'extract-engines.mjs', 'serve.mjs', 'package-source.py', 'verify-browsers.mjs', 'verification-report.mjs', 'profile-flight.mjs'])
files = sorted(p for p in files if p.name != '.DS_Store' and not p.name.endswith('.original.html') and not p.is_symlink())
source = out / 'Space-Patriot-source.zip'
with ZipFile(source, 'w', compression=ZIP_DEFLATED, compresslevel=9) as archive:
    for path in files:
        archive.write(path, 'Space-Patriot-source/' + path.relative_to(root).as_posix())
    archive.writestr('Space-Patriot-source/START-HERE.txt',
        'Space Patriot source\n\nInstall Node.js 20 or newer. In this folder run:\n'
        '  npm ci\n  npm run build\n  npm run dev\n\n'
        'Open http://localhost:4173 in a desktop WebGL 2 browser.\n'
        'npm run build also creates Space_Patriot.html for offline solo play.\n'
        'Original engine sources in vendor/user-engines are required by the build.\n'
        'Art PNGs are the production textures and cockpit/weapon assets.\n'
        'Git history, dependencies, generated builds, recordings and test output are excluded.\n')
player = out / 'Space-Patriot-play.zip'
with ZipFile(player, 'w', compression=ZIP_DEFLATED, compresslevel=9) as archive:
    archive.write(root / 'Space_Patriot.html', 'Space_Patriot.html')
    archive.writestr('READ-ME.txt',
        'Space Patriot\n\nExtract this ZIP, then open Space_Patriot.html in a desktop WebGL 2 browser.\n'
        'Download the entire file before opening it. Messaging and file preview windows may not run games.\n'
        'Solo play is offline. Multiplayer requires internet signaling and WebRTC.\n'
        'Start in your home hangar. L launches, Tab/Esc pauses, Z interacts or releases the cockpit cursor.\n'
        'If graphics fail, use Download diagnostics on the error screen.\n')
report = {'sourceFiles': len(files), 'excluded': ['.git', 'node_modules', 'artifacts', 'releases', 'index.html', 'Space_Patriot.html', '*.original.html'], 'archives': []}
for path in [source, player]:
    with ZipFile(path) as archive:
        assert archive.testzip() is None
        members = archive.namelist()
        assert not any('/.git/' in name or '/node_modules/' in name or '/artifacts/' in name for name in members)
    report['archives'].append({'file': path.name, 'bytes': path.stat().st_size, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest(), 'entries': len(members)})
(out / 'manifest.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report, indent=2))
