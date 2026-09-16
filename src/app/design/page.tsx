import { cookies } from "next/headers";
import { DesignForm } from "@/components/design-form";
import { InstallPrompt } from "@/components/install-prompt";
import { PageHeader } from "@/components/ui/page-header";
import { findIdentityByToken } from "@/lib/identity";
import { sessionTokenFromCookies } from "@/lib/session";
import { draftFromPayload, getDraftDesign } from "@/lib/designs";
import { emptyScreenDraft } from "@/lib/orders";
import {
  TRACKING_COOKIE,
  emptyTracking,
  mergeTracking,
  parseTrackingCookie,
  trackingFromIdentity,
} from "@/lib/tracking";
import { FREIGHT_DISCLAIMER } from "@/lib/site";
import type { SendContactDetails } from "@/lib/contact";
import { EMPTY_CONTACT } from "@/lib/contact";

export const metadata = { title: "Design your screen" };

export default async function DesignPage() {
  const token = await sessionTokenFromCookies();
  const identity = token ? await findIdentityByToken(token) : null;
  const saved = identity ? await getDraftDesign(identity.id) : null;
  const draft = saved ? draftFromPayload(saved.payload) : emptyScreenDraft();
  const contact: SendContactDetails = identity
    ? {
        first_name: identity.first_name,
        email: identity.email,
        phone: identity.phone || "",
        postcode: identity.postcode,
        marketing_consent: identity.marketing_consent,
      }
    : EMPTY_CONTACT;
  const cookieStore = await cookies();
  const cookieTracking = parseTrackingCookie(
    cookieStore.get(TRACKING_COOKIE)?.value
  );
  const tracking = mergeTracking(
    identity ? trackingFromIdentity(identity) : emptyTracking(),
    cookieTracking
  );

  return (
    <main className="app-main space-y-6">
      <PageHeader
        title="Design your shower screen"
        description={`See the supply price as you build. ${FREIGHT_DISCLAIMER}.`}
      />
      <InstallPrompt />
      <DesignForm
        initialDraft={draft}
        hasServerDraft={Boolean(saved)}
        initialContact={contact}
        tracking={tracking}
      />
    </main>
  );
}
