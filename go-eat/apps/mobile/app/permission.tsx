/**
 * `goeat://permission` (contracts/deep-link.md) — the widget's `permission_required` state routes
 * here directly (FR-004, FR-029). Redirects into the single real implementation at
 * `/onboarding/permission` rather than duplicating the screen.
 */

import { Redirect } from 'expo-router';

export default function PermissionRedirect() {
  return <Redirect href="/onboarding/permission" />;
}
