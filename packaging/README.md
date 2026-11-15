# Packaging

The primary channel is the `.deb` attached to each tagged GitHub Release. The
files here are the next step, and are deliberately marked unfinished.

## AUR

`PKGBUILD` builds from the tagged source tarball.

1. Publish a `v0.1.1` tag; the `source=` line expects
   `https://github.com/tarun-bansal/truecast/archive/v0.1.1.tar.gz`.
3. On Arch: `makepkg -si` in this directory, then
   `makepkg --printsrcinfo > .SRCINFO` and push both to the AUR package
   `truecast`.

Check the `depends` list against `ldd release/linux-unpacked/truecast` on a clean
Arch box — Electron's runtime requirements drift between releases.

## Flathub

Not submitted, and no manifest is shipped, because a Flathub submission needs a
public repository and a signed-off runtime that cannot be validated from here.
The shape of the work:

1. Public repo + tagged release (prerequisite for both channels).
2. `org.freedesktop.Platform` 25.08 runtime and the Electron
   `zypak`/`--no-sandbox` pattern, or package the `linux-unpacked` directory as
   an app module.
3. `flatpak-builder --user --install --force-clean build-dir <manifest>.yml`,
   then `flatpak run com.truecast.Weather` and a screenshot for the submission.
4. Flathub review: the linter rejects unstripped binaries and missing
   metainfo; add `packaging/com.truecast.Weather.metainfo.xml` first.

## Why not Snap

The app is frameless and uses `--no-sandbox`; Snap's confinement makes both
awkward for little gain over the `.deb`.
