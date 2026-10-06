# Building Orbit Workspace

Requirements: Windows, Python 3, 7-Zip, NSIS 3, and the Unicode x86 Nsis7z plugin. Install these tools separately. Use a plugin directory containing `Nsis7z.dll`.

The Electron runtime template is bundled with the complete release ZIP. For a Git clone, the build script downloads the pinned `v1.8.3` template from this repository's GitHub Release when it is missing.

```powershell
powershell -ExecutionPolicy Bypass -File .\build.ps1 -SevenZip "C:\Program Files\7-Zip\7z.exe" -MakeNsis "C:\Program Files (x86)\NSIS\makensis.exe" -NsisPluginDirectory "C:\Tools\Nsis7z\x86-unicode"
```

If Python is not on PATH, add `-PythonExecutable "C:\Path\To\python.exe"`. Substitute your actual tool paths.

Edit the interface in `app/dist/`, desktop behavior in `app/desktop/`, metadata in `app/package.json`, and launcher/version information in `build/Orbit.nsi`. No frontend transpilation step is required. Update the package and NSIS version fields together for a new version.

The executable and companion files are generated in `dist/`. Each build uses a fresh `build-work-*` directory for inspection. You may remove those generated directories after the build.

Redistribution must preserve the MIT copyright/permission notice and applicable third-party license notices.
