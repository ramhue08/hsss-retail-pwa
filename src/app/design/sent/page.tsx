import Link from "next/link";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { findIdentityByToken } from "@/lib/identity";
import { sessionTokenFromCookies } from "@/lib/session";
import { findSentDesign } from "@/lib/designs";
import { formatMoney } from "@/lib/pricing";
import { FREIGHT_DISCLAIMER, RETAIL_PHONE_DISPLAY, RETAIL_PHONE_TEL } from "@/lib/site";

export const metadata = { title: "Design sent" };

export default async function DesignSentPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const token = await sessionTokenFromCookies();
  const identity = token ? await findIdentityByToken(token) : null;
  if (!identity) redirect("/design");

  const { ref } = await searchParams;
  const design = ref ? await findSentDesign(ref) : null;

  return (
    <main className="app-main space-y-6">
      <PageHeader
        title="We have your design"
        description={`Freight will be quoted to postcode ${identity.postcode}. We will be in touch — there is no payment in this app.`}
      />
      <Card className="space-y-4">
        <p className="text-sm text-slate-600">
          Thanks {identity.first_name}. Your design has landed with Hydro Seal
          Shower Systems.
        </p>
        {design ? (
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Reference</dt>
              <dd className="font-semibold text-navy">{design.design_ref}</dd>
            </div>
            {design.summary ? (
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Build</dt>
                <dd className="text-right text-navy">{design.summary}</dd>
              </div>
            ) : null}
            {design.finish ? (
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Finish</dt>
                <dd className="text-navy">{design.finish}</dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Supply price</dt>
              <dd className="text-right font-semibold text-navy">
                {formatMoney(Number(design.supply_price_ex_freight ?? 0))} ex GST
                <span className="mt-0.5 block text-xs font-medium text-slate-500">
                  {FREIGHT_DISCLAIMER}
                </span>
              </dd>
            </div>
          </dl>
        ) : null}
        <a
          href={`tel:${RETAIL_PHONE_TEL}`}
          className="block rounded-xl border border-[var(--color-border)] bg-slate-50 px-4 py-3 text-center text-sm font-semibold text-navy"
        >
          Call {RETAIL_PHONE_DISPLAY} if you are unsure
        </a>
        <Link
          href="/design"
          className="block rounded-xl bg-cyan px-4 py-3 text-center text-sm font-semibold text-navy-deep"
        >
          Keep designing
        </Link>
      </Card>
    </main>
  );
}
