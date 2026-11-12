import { useTranslation } from "react-i18next";
import type { Fulfilment } from "../model";

/**
 * Says that a Motivator is Met or Unmet with more than the place of its Card or a colour: a symbol (drawn by styles.css,
 * hidden from screen readers) and its UI string, read by screen readers only.
 */
export default function FulfilmentMark({ fulfilment, id }: { fulfilment: Fulfilment; id?: string }) {
  const { t } = useTranslation();
  return (
    <span className="fulfilment-mark" data-fulfilment={fulfilment} id={id}>
      <span className="visually-hidden">{t(`fulfilment.${fulfilment}`)}</span>
    </span>
  );
}
