import { dump } from "js-yaml";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, state } from "lit/decorators";
import "../../../components/ha-alert";
import { HomeAssistant } from "../../../types";
import { LovelaceCard } from "../types";
import { ErrorCardConfig } from "./types";

@customElement("hui-error-card")
export class HuiErrorCard extends LitElement implements LovelaceCard {
  public hass?: HomeAssistant;

  @state() private _config?: ErrorCardConfig;

  public getCardSize(): number {
    return 4;
  }

  public setConfig(config: ErrorCardConfig): void {
    this._config = config;
  }

  protected render(): TemplateResult {
    if (!this._config) {
      return html``;
    }

    let dumped: string | undefined;

    if (this._config.origConfig) {
      try {
        dumped = dump(this._config.origConfig);
      } catch (err) {
        dumped = `[Error dumping ${this._config.origConfig}]`;
      }
    }

    return html`<ha-alert alert-type="error" .title=${this._config.error}>
      ${dumped ? html`<pre>${dumped}</pre>` : ""}
    </ha-alert>`;
  }

  static get styles(): CSSResultGroup {
    return css`
      pre {
        font-family: var(--code-font-family, monospace);
        text-overflow: ellipsis;
        user-select: text;
        overflow: hidden;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-error-card": HuiErrorCard;
  }
}
