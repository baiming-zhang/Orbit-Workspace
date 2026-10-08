# Publishing an update

Update the application and launcher versions together, build the portable EXE, and validate the edited behavior in an isolated profile. Check that the packaged ASAR matches `app/` and contains the production entry point.

Before packaging, add the new version's changes to the **What's new** section near the bottom of the root README. Include concrete additions, fixes, or improvements; distinguish shipped features from extension ideas. Keep the complete Windows/source ZIP consistent with that README and source commit.

Publish a GitHub Release with `Orbit.exe`, the optional API bridge, the runtime template, the complete Windows/source ZIP, and a SHA256 manifest. Verify the uploaded assets before removing older packages. Run:

```powershell
./cleanup-releases.ps1 -VerifiedTag v1.8.4 -SHA256File ./Orbit-Workspace-1.8.4-SHA256.txt
```

The cleanup script verifies every file named in the manifest against GitHub's uploaded-asset SHA256 digest, then removes older numbered GitHub Releases and their assets. It preserves Git tags and source history. `-Preview` lists the release packages that would be removed. Do not remove the previous packages if publication or verification fails.

For the desktop personal application, replace its existing EXE path after an orderly shutdown, preserve the existing user-data profile, and retain the matching latest source. Recycle obsolete local builds and build/test temporary files after the replacement is verified.
