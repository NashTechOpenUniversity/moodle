// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

/**
 *  JavaScript to the use mp3-mediarecorder library.
 *
 * @module     atto_recordrtc/mediarecorder
 * @package    atto_recordrtc
 * @copyright  2021 The Open University
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {Mp3MediaRecorder} from '././local/mp3-mediarecorder/mp3-mediarecorder';

const workerURL = URL.createObjectURL(new Blob([
    // Now load the script in the Workers context.
    "importScripts('" +
    M.cfg.wwwroot + "/lib/editor/atto/plugins/recordrtc/amd/src/local/mp3-mediarecorder/mp3-mediarecorder-worker.js');",

    // The above script exports all methods in a new mp3EncoderWorker object.
    "mp3EncoderWorker.initMp3MediaEncoder({vmsgWasmUrl: '" +
    M.cfg.wwwroot + "/lib/editor/atto/plugins/recordrtc/amd/src/local/mp3-mediarecorder/vmsg.wasm'});",

], {type: 'application/javascript'}));

export default {
    Mp3MediaRecorder,
    workerURL
};
