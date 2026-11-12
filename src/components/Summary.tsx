import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import Markdown from "react-markdown";
import type { Fulfilments, Motivator, Order } from "../model";
import FulfilmentMark from "./FulfilmentMark";

interface Props {
  motivators: Motivator[];
  order: Order;
  fulfilment: Fulfilments;
  /** False while the Board is still as dealt: its Order says nothing about the Person yet. */
  ordered: boolean;
}

/** How many Motivators each end of the summary shows, at most. */
const SHOWN = 3;

/**
 * What the Order says, beside the Board: the most motivating Motivators, with their Descriptions, and the least
 * motivating ones. The most motivating never take every Card, and the least take what is left, up to three. Each one
 * shows its rank, 1 being the most important: decoration, since the lists already give screen readers their order.
 */
export default function Summary({ motivators, order, fulfilment, ordered }: Props) {
  const { t } = useTranslation();
  const byKey = new Map(motivators.map((motivator) => [motivator.key, motivator]));
  const most = order.slice(order.length - Math.min(SHOWN, order.length - 1)).reverse();
  const least = order.slice(0, Math.min(SHOWN, order.length - most.length));
  /** The Title of a listed Motivator, with its Fulfilment when it has one. */
  const name = (motivator: Motivator) => {
    const marked = fulfilment[motivator.key];
    return (
      <div className="summary-name">
        <h3 className="summary-title">{motivator.title}</h3>
        {marked && <FulfilmentMark key={marked} fulfilment={marked} />}
      </div>
    );
  };

  return (
    <aside className="summary" aria-label={t("summary.label")}>
      <p className="summary-eyebrow" aria-hidden="true">
        {t("summary.label")}
      </p>
      {!ordered ? (
        <p className="summary-empty">{t("summary.empty")}</p>
      ) : (
        <>
          {most.length > 0 && (
            <section className="summary-section">
              <h2 className="summary-heading">{t("summary.most")}</h2>
              <ol className="summary-list" data-end="most">
                {most.map((key, index) => {
                  const motivator = byKey.get(key)!;
                  return (
                    <li key={key} className="summary-item" style={{ "--motivator-colour": motivator.colour } as CSSProperties}>
                      <span className="summary-rank" aria-hidden="true">
                        {index + 1}
                      </span>
                      <span className="summary-disc" aria-hidden="true">
                        <img src={motivator.icon} alt="" />
                      </span>
                      <div className="summary-text">
                        {name(motivator)}
                        <div className="summary-description">
                          <Markdown>{motivator.description}</Markdown>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>
          )}
          {least.length > 0 && (
            <section className="summary-section">
              <h2 className="summary-heading">{t("summary.least")}</h2>
              <ol className="summary-list" data-end="least">
                {least.map((key, index) => {
                  const motivator = byKey.get(key)!;
                  return (
                    <li key={key} className="summary-item" style={{ "--motivator-colour": motivator.colour } as CSSProperties}>
                      <span className="summary-rank" aria-hidden="true">
                        {order.length - index}
                      </span>
                      <span className="summary-disc" aria-hidden="true">
                        <img src={motivator.icon} alt="" />
                      </span>
                      <div className="summary-text">{name(motivator)}</div>
                    </li>
                  );
                })}
              </ol>
            </section>
          )}
        </>
      )}
    </aside>
  );
}
