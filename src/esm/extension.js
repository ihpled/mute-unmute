/*
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * Author: Mauro Castaldo
 */

/* exported init */

import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';

import * as Config from 'resource:///org/gnome/shell/misc/config.js';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as Volume from 'resource:///org/gnome/shell/ui/status/volume.js';

let OUTPUT_ICON = 'audio-speakers-symbolic';
const MUTE_ICON = 'audio-volume-muted-symbolic';

const Indicator = GObject.registerClass(
  class Indicator extends PanelMenu.Button {

    _doInit() {
          if (!Main.panel.statusArea.quickSettings._volumeOutput || !Volume.getMixerControl().get_default_sink()) {
            setTimeout(() => {this._doInit()}, 1000);
            return;
          }

          this._volumeOutput = Main.panel.statusArea.quickSettings._volumeOutput;

          this._default_sink = Volume.getMixerControl().get_default_sink();

          this._volume_event_id = this._volumeOutput.connect(
            'button-press-event',
            (actor, event) => {
              if (event.get_button() === Clutter.BUTTON_MIDDLE) {
                this._toggleMuted();
                return Clutter.EVENT_STOP;
              }
              return Clutter.EVENT_PROPAGATE;
            }
          );
    }
    

    _init() {
      super._init(0.0, _('Mute Unmute Indicator'), true);
      this.hide();
      this._doInit();
    }

    _onDestroy() {
      if (this._volumeOutput) {
        if (this._volume_event_id)
          this._volumeOutput.disconnect(this._volume_event_id);
        this._volumeOutput._output._icon.icon_name = OUTPUT_ICON;
      }
      super._onDestroy();
    }

    _toggleMuted() {
      if (this._isMuted()) {
        // Unmute
        this._setMuted(false);
        //Main.notify('Audio unmuted');
      } else {
        // Mute
        this._setMuted(true);
        //Main.notify('Audio muted');
      }
    }

    _setMuted(value) {
      if (!this._default_sink) return;
      this._default_sink.change_is_muted(value);
    }

    _isMuted() {
      if (!this._default_sink) return false;
      return this._default_sink.is_muted;
    }
  }
);

export default class MuteUnmuteExtension extends Extension {
  constructor(meta) {
    super(meta);
    this._uuid = meta.uuid;
  }

  enable() {
    this._indicator = new Indicator();
    Main.panel.addToStatusArea(this._uuid, this._indicator);
  }

  disable() {
    this._indicator.destroy();
    this._indicator = null;
  }
}

function init(meta) {
  return new MuteUnmuteExtension(meta);
}
