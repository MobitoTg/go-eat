# Third-party notices

Go-Eat incorporates the third-party material listed below. Constitution VI.2 pins the palette
version, and the MIT license requires the notice to travel with the work (FR-041).

---

## Open Color

- **Version**: 1.9.1 (**pinned**)
- **Author**: yeun (Heeyeun Jeong)
- **Homepage**: https://yeun.github.io/open-color/
- **Repository**: https://github.com/yeun/open-color
- **License**: MIT
- **Used for**: Layer 1 color primitives — `specs/design-system/color-primitives.json`, transcribed
  into `packages/design-tokens/src/primitives.ts`.

**Why the version is pinned.** Upstream states that colors may change between versions. Every
contrast ratio recorded in `specs/design-system/color-semantics.md` was computed against exactly
these values, so a version bump silently invalidates all of them. Per Constitution VI.2, bumping
the version requires re-running the blocking contrast gate (`npm run contrast:gate`) before merge —
the gate asserts the pinned version and will fail if the two disagree.

**Not a brand identity.** Constitution VI.2 prohibits using Open Color as the product's brand
identity color. It is a utility palette, used here for its verified perceived-brightness scale.

```
MIT License

Copyright (c) 2016 heeyeun

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## Google Places API (New)

- **Used for**: restaurant candidates — name, types, rating, review count, opening hours, business
  status, and the place ID that tap-through deep links target.
- **Terms**: Google Maps Platform Terms of Service and Service Specific Terms.
- **SKU**: `Places API Nearby Search Enterprise` (772E-9975-BE34). See research R3a.

**Retention**: Places content other than the Place ID may be cached for at most **30 consecutive
calendar days** (Service Specific Terms §3.2.3(b)); Place IDs are exempt and may be stored
indefinitely. Go-Eat stores neither server-side and holds the device-local batch only until the
next cycle replaces it — bounded by `batchTrustSeconds` (1800s), which is four orders of magnitude
inside the limit. Principle V is stricter than the terms in every dimension where the two overlap.

> **TODO — before store submission.** Places policies impose attribution requirements when Places
> content is displayed. The widget shows a name and a rating sourced from Places, so the required
> attribution surface must be confirmed and recorded here. Not a build blocker; it *is* a
> submission blocker. Tracked in research R3a.
