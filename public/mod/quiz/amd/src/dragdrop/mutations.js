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
 * JavaScript for Mutations library.
 *
 * @module    mod_quiz/dragdrop/mutations
 * @copyright 2024 The Open University
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import Ajax from 'core/ajax';
import {SELECTORS} from 'mod_quiz/dragdrop/selectors';
import {slot, util} from 'mod_quiz/quiz_utils';
import {initResourceToolbox} from 'mod_quiz/quiz_toolboxes';

/**
 * Mutations library for mod_quiz_dragdrop.
 * The functions are just used to forward data to the webservice.
 */
export default class {

    /**
     * Moves a question to a new slot.
     *
     * @param {*} stateManager StateManager instance
     * @param {Object} dragData Id of the column to move
     * @param {Element} dropZoneNode Id of the column before (0 means to insert at the left of the board)
     */
    async moveQuestion(stateManager, dragData, dropZoneNode) {
        let goingUp = dragData.slotorder > dropZoneNode.dataset.slotorder;
        if (dropZoneNode.dataset.moveafter) {
            goingUp = false;
        }
        // We want to update the front-end UI first so that we can get the correct previous slot and previous page.
        this.processUpdates(stateManager, dropZoneNode, dragData, goingUp);
        const dragNode = document.getElementById(dragData.id);
        let previousSlot = slot.getPrevious(dragNode, SELECTORS.SLOT_SELECTOR);
        let previousPage = slot.getPrevious(dragNode, SELECTORS.PAGE_SELECTOR);
        previousSlot = previousSlot ? util.getNumber(previousSlot.id) : 0;
        previousPage = previousPage ? util.getNumber(previousPage.id) : 0;

        const result = await this._moveQuestionToSlot(dragData.quizid, util.getNumber(dragData.id),
            util.getNumber(dragNode.closest(SELECTORS.MAIN_SECTION).id), previousSlot, previousPage);
        if (result.visible) {
            initResourceToolbox(dragData.courseid, dragData.quizid, false).reorganiseEditPage();
        }
    }

    /**
     * Move question to a new slot webservice.
     *
     * @param {Number} quizid
     * @param {Number} slotid
     * @param {Number} sectionid
     * @param {Number} previousslotid
     * @param {Number} page
     * @returns {Promise<*>}
     * @private
     */
    async _moveQuestionToSlot(quizid, slotid, sectionid, previousslotid, page) {
        return Ajax.call([{
            methodname: 'mod_quiz_move_slot',
            args: {
                quizid: quizid,
                id: slotid,
                previousid: previousslotid,
                sectionid: sectionid,
                page: page,
            },
        }])[0];
    }

    /**
     *
     * Update state object.
     *
     * @param {*} stateManager
     * @param {HTMLElement} dropZoneNode
     * @param {Object} dragData
     * @param {Boolean} goingup
     */
    async processUpdates(stateManager, dropZoneNode, dragData, goingup) {
        const updateUI = {
            name: 'question',
            action: 'put',
            fields: {
                id: dragData.id,
                ismove: true,
                goingup: goingup,
                dropzoneslotorder: dropZoneNode.dataset.slotorder,
                dragslotoder: dragData.slotorder,
                previousslotid: dropZoneNode.id,
            }
        };
        // The first update to change state object to update the UI in the front-end.
        stateManager.processUpdates([updateUI]);
        const revertIsMoveState = {
            name: 'question',
            action: 'put',
            fields: {
                id: dragData.id,
                ismove: false,
            }
        };
        // The second update just revert back the ismove state.
        stateManager.processUpdates([revertIsMoveState]);
    }
}