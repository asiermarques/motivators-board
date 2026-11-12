import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

interface Props {
  name: string;
  onNameChange: (name: string) => void;
  /** The Share link of the Person on screen, which may be ahead of the address bar. */
  link: string;
}

type CopyStatus = "copy" | "copied" | "failed";

/** The Person's name and the button that copies their Share link. */
export default function PersonPanel({ name, onNameChange, link }: Props) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<CopyStatus>("copy");

  useEffect(() => {
    if (status === "copy") return;
    const timeout = window.setTimeout(() => setStatus("copy"), 2400);
    return () => window.clearTimeout(timeout);
  }, [status]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setStatus("copied");
    } catch {
      setStatus("failed");
    }
  }

  return (
    <div className="person-panel">
      <input
        className="person-name"
        aria-label={t("person.name")}
        placeholder={t("person.name")}
        spellCheck={false}
        autoComplete="off"
        maxLength={80}
        value={name}
        onChange={(event) => onNameChange(event.target.value)}
      />
      <button type="button" className="share-button" data-status={status} onClick={copy}>
        <svg className="share-icon" viewBox="0 0 16 16" aria-hidden="true">
          {status === "copied" ? (
            <path d="M3 8.5l3 3 7-7" />
          ) : (
            <path d="M6.5 9.5l3-3M7 4.5l1.3-1.3a2.8 2.8 0 014 4L11 8.5M9 11.5l-1.3 1.3a2.8 2.8 0 01-4-4L5 7.5" />
          )}
        </svg>
        <span aria-live="polite">{t(`share.${status}`)}</span>
      </button>
    </div>
  );
}
