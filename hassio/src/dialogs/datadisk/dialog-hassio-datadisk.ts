import "@polymer/paper-dropdown-menu/paper-dropdown-menu";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../src/common/dom/fire_event";
import "../../../../src/components/ha-circular-progress";
import "../../../../src/components/ha-markdown";
import {
  extractApiErrorMessage,
  ignoreSupervisorError,
} from "../../../../src/data/hassio/common";
import {
  DatadiskList,
  listDatadisks,
  moveDatadisk,
} from "../../../../src/data/hassio/host";
import { Supervisor } from "../../../../src/data/supervisor/supervisor";
import { showAlertDialog } from "../../../../src/dialogs/generic/show-dialog-box";
import { haStyle, haStyleDialog } from "../../../../src/resources/styles";
import { HomeAssistant } from "../../../../src/types";
import { HassioDatatiskDialogParams } from "./show-dialog-hassio-datadisk";

const calculateMoveTime = memoizeOne((supervisor: Supervisor): number => {
  const speed = supervisor.host.disk_life_time !== "" ? 30 : 10;
  const moveTime = (supervisor.host.disk_used * 1000) / 60 / speed;
  const rebootTime = (supervisor.host.startup_time * 4) / 60;
  return Math.ceil((moveTime + rebootTime) / 10) * 10;
});

@customElement("dialog-hassio-datadisk")
class HassioDatadiskDialog extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private dialogParams?: HassioDatatiskDialogParams;

  @state() private selectedDevice?: string;

  @state() private devices?: DatadiskList["devices"];

  @state() private moving = false;

  public showDialog(params: HassioDatatiskDialogParams) {
    this.dialogParams = params;
    listDatadisks(this.hass).then((data) => {
      this.devices = data.devices;
    });
  }

  public closeDialog(): void {
    this.dialogParams = undefined;
    this.selectedDevice = undefined;
    this.devices = undefined;
    this.moving = false;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render(): TemplateResult {
    if (!this.dialogParams) {
      return html``;
    }
    return html`
      <ha-dialog
        open
        scrimClickAction
        escapeKeyAction
        @closed=${this.closeDialog}
        ?hideActions=${this.moving}
      >
        ${this.moving
          ? html`<slot name="heading">
                <h2 id="title" class="header_title">
                  ${this.dialogParams.supervisor.localize(
                    "dialog.datadisk_move.moving"
                  )}
                </h2>
              </slot>
              <ha-circular-progress alt="Moving" size="large" active>
              </ha-circular-progress>
              <p class="progress-text">
                ${this.dialogParams.supervisor.localize(
                  "dialog.datadisk_move.moving_desc"
                )}
              </p>`
          : html`<slot name="heading">
                <h2 id="title" class="header_title">
                  ${this.dialogParams.supervisor.localize(
                    "dialog.datadisk_move.title"
                  )}
                </h2>
              </slot>
              ${this.devices?.length
                ? html`
                    ${this.dialogParams.supervisor.localize(
                      "dialog.datadisk_move.description",
                      {
                        current_path: this.dialogParams.supervisor.os.data_disk,
                        time: calculateMoveTime(this.dialogParams.supervisor),
                      }
                    )}
                    <br /><br />

                    <paper-dropdown-menu
                      .label=${this.dialogParams.supervisor.localize(
                        "dialog.datadisk_move.select_device"
                      )}
                      @value-changed=${this._select_device}
                    >
                      <paper-listbox slot="dropdown-content">
                        ${this.devices.map(
                          (device) => html`<paper-item>${device}</paper-item>`
                        )}
                      </paper-listbox>
                    </paper-dropdown-menu>
                  `
                : this.devices === undefined
                ? this.dialogParams.supervisor.localize(
                    "dialog.datadisk_move.loading_devices"
                  )
                : this.dialogParams.supervisor.localize(
                    "dialog.datadisk_move.no_devices"
                  )}

              <mwc-button slot="secondaryAction" @click=${this.closeDialog}>
                ${this.dialogParams.supervisor.localize(
                  "dialog.datadisk_move.cancel"
                )}
              </mwc-button>

              <mwc-button
                .disabled=${!this.selectedDevice}
                slot="primaryAction"
                @click=${this._moveDatadisk}
              >
                ${this.dialogParams.supervisor.localize(
                  "dialog.datadisk_move.move"
                )}
              </mwc-button>`}
      </ha-dialog>
    `;
  }

  private _select_device(event) {
    this.selectedDevice = event.detail.value;
  }

  private async _moveDatadisk() {
    this.moving = true;
    try {
      await moveDatadisk(this.hass, this.selectedDevice!);
    } catch (err) {
      if (this.hass.connection.connected && !ignoreSupervisorError(err)) {
        showAlertDialog(this, {
          title: this.dialogParams!.supervisor.localize(
            "system.host.failed_to_move"
          ),
          text: extractApiErrorMessage(err),
        });
        this.closeDialog();
      }
    }
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      haStyleDialog,
      css`
        paper-dropdown-menu {
          width: 100%;
        }
        ha-circular-progress {
          display: block;
          margin: 32px;
          text-align: center;
        }

        .progress-text {
          text-align: center;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-hassio-datadisk": HassioDatadiskDialog;
  }
}
