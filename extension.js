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

const GETTEXT_DOMAIN = 'mute-unmute-extension';

const { Clutter, GObject, St } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Main = imports.ui.main;
const Mainloop = imports.mainloop;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Volume = imports.ui.status.volume;
const Gettext = imports.gettext;
const Domain = Gettext.domain(GETTEXT_DOMAIN);
const _ = Domain.gettext;

const DEFAULT_OUTPUT_ICON = 'audio-speakers-symbolic';

const Indicator = GObject.registerClass(
class Indicator extends PanelMenu.Button {
    _init() {
        super._init(0.0, _('My Shiny Indicator'), true);

        this.hide();

        this._aggregateMenu = Main.panel.statusArea.aggregateMenu;
        this._volume = this._aggregateMenu._volume;
        this._volumeMenu = this._volume._volumeMenu;

        this._volumeMenu._output._icon.set_reactive(true);
        this._output_icon_event_id = this._volumeMenu._output._icon.connect('event', this._onClicked.bind(this));

        this._default_sink = Volume.getMixerControl().get_default_sink();

        this._default_sink_changed_id = Volume.getMixerControl().connect('default-sink-changed', () => {
            //log('DEFAULT-SINK-CHANGED');
            this._default_sink = Volume.getMixerControl().get_default_sink();
            this._updateOutputIcon();             
        });
        
        this._stream_changed_id = Volume.getMixerControl().connect('stream-changed', () => {
            //log('STREAM-CHANGED');
            this._updateOutputIcon(); 
        });

    }

    _updateOutputIcon() {
        if (this._isMuted() && this._volumeMenu._output._icon.icon_name != 'audio-volume-muted-symbolic') {
            // Status changed to Muted
            this._volumeMenu._output._icon.icon_name = 'audio-volume-muted-symbolic';
        } else if (!this._isMuted() && this._volumeMenu._output._icon.icon_name == 'audio-volume-muted-symbolic') {
            // Status changed to Unmuted
            this._volumeMenu._output._icon.icon_name = DEFAULT_OUTPUT_ICON;
        }
    }

    _onDestroy() {
        if (this._source)
            Mainloop.source_remove(this._source);
        if (this._default_sink_changed_id)
            Volume.getMixerControl().disconnect(this._default_sink_changed_id);
        if (this._output_icon_event_id)
            this._volumeMenu._output._icon.disconnect(this._output_icon_event_id);    
        if (this._stream_changed_id)
            Volume.getMixerControl().disconnect(this._stream_changed_id);
        this._volumeMenu._output._icon.icon_name = DEFAULT_OUTPUT_ICON;
        super._onDestroy();
    }

    _onClicked(actor, event) {
        if ((event.type() !== Clutter.EventType.TOUCH_BEGIN && event.type() !== Clutter.EventType.BUTTON_PRESS)) {
            // Some other non-clicky event happened; bail
            return Clutter.EVENT_PROPAGATE;
        }
        this._toggleMuted();
        
        return Clutter.EVENT_STOP;
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
});

class Extension {
    constructor(uuid) {
        this._uuid = uuid;

        ExtensionUtils.initTranslations(GETTEXT_DOMAIN);
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
    return new Extension(meta.uuid);
}