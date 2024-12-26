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

const Indicator = GObject.registerClass(
  class Indicator extends PanelMenu.Button {

    _doInit() {
          // Each time a timeout expires it checks if can initialize otherwise set a new timeout until check is true
          if (!Main.panel.statusArea.quickSettings._volumeOutput || !Volume.getMixerControl().get_default_sink()) {
            // Saves timeout handle to clear it if during wait time the extension is disabled or removed (destroyed)  
            this._initTimeout = setTimeout(() => {this._doInit()}, 1000);
            return;
          }

          // Output

          this._volumeOutput = Main.panel.statusArea.quickSettings._volumeOutput;
          
          this._default_sink = Volume.getMixerControl().get_default_sink();

          this._volume_output_event_id = this._volumeOutput.connect(
            'button-press-event',
            (actor, event) => {
              if (event.get_button() === Clutter.BUTTON_MIDDLE) {
                this._toggleOutputMuted();
                return Clutter.EVENT_STOP;
              }
              return Clutter.EVENT_PROPAGATE;
            }
          );

          // Input

          this._volumeInput = Main.panel.statusArea.quickSettings._volumeInput;

          this._default_source = Volume.getMixerControl().get_default_source();

          this._volume_input_event_id = this._volumeInput.connect(
            'button-press-event',
            (actor, event) => {
              if (event.get_button() === Clutter.BUTTON_MIDDLE) {
                this._toggleInputMuted();
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
        if (this._volume_output_event_id)
          this._volumeOutput.disconnect(this._volume_output_event_id);
      }
      if (this._volumeInput) {
        if (this._volume_input_event_id)
          this._volumeInput.disconnect(this._volume_input_event_id);
      }
      if (this._initTimeout) {
        clearTimeout(this._initTimeout);
      }
      super._onDestroy();
    }

    // Output

    _toggleOutputMuted() {
      if (this._isOutputMuted()) {
        // Unmute Output
        this._setOutputMuted(false);
        //Main.notify('Output unmuted');
      } else {
        // Mute Output
        this._setOutputMuted(true);
        //Main.notify('Output muted');
      }
    }

    _setOutputMuted(value) {
      if (!this._default_sink) return;
      this._default_sink.change_is_muted(value);
    }

    _isOutputMuted() {
      if (!this._default_sink) return false;
      return this._default_sink.is_muted;
    }

    // Input

    _toggleInputMuted() {
      if (this._isInputMuted()) {
        // Unmute Input
        this._setInputMuted(false);
        //Main.notify('Input unmuted');
      } else {
        // Mute Input
        this._setInputMuted(true);
        //Main.notify('Input muted');
      }
    }

    _setInputMuted(value) {
      if (!this._default_source) return;
      this._default_source.change_is_muted(value);
    }

    _isInputMuted() {
      if (!this._default_source) return false;
      return this._default_source.is_muted;
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
