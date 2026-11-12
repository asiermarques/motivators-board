import { useTranslation } from "react-i18next";
import type { Motivator } from "../model";
import type { LinkNotice as Notice } from "../urlState";

interface Props {
  notice: Notice;
  motivators: Motivator[];
  onDismiss: () => void;
}

/** The dismissible message about what Normalisation ignored or added when the Share link was opened. */
export default function LinkNotice({ notice, motivators, onDismiss }: Props) {
  const { t } = useTranslation();
  const title = (key: string) => motivators.find((motivator) => motivator.key === key)?.title ?? key;
  const lines = [
    notice.ignored.length > 0 && t("notice.ignored", { list: notice.ignored.join(", ") }),
    notice.added.length > 0 && t("notice.added", { list: notice.added.map(title).join(", ") }),
    notice.locale !== undefined && t("notice.locale", { locale: notice.locale }),
    notice.parameters.length > 0 && t("notice.parameters", { list: notice.parameters.join(", ") }),
    notice.fulfilment.ignored.length > 0 && t("notice.fulfilmentIgnored", { list: notice.fulfilment.ignored.join(", ") }),
    notice.fulfilment.both.length > 0 && t("notice.fulfilmentBoth", { list: notice.fulfilment.both.map(title).join(", ") }),
  ].filter((line): line is string => Boolean(line));

  return (
    <section className="link-notice" aria-label={t("notice.label")}>
      <div className="link-notice-message">
        {lines.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
      <button type="button" className="link-notice-dismiss" onClick={onDismiss}>
        {t("notice.dismiss")}
      </button>
    </section>
  );
}
