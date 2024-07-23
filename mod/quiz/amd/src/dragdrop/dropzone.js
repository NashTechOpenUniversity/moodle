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
 * JavaScript for the drop zone component.
 *
 * @module    mod_quiz/dragdrop/dropzone
 * @copyright 2024 The Open University
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {BaseComponent, DragDrop} from 'core/reactive';
import {CSS, SELECTORS} from 'mod_quiz/dragdrop/selectors';
import {slot} from 'mod_quiz/quiz_utils';

export default class extends BaseComponent {

    /**
     * The state is ready.
     */
    stateReady() {
        this.dragdrop = new DragDrop(this);
    }

    /**
     * Remove all subcomponents dependencies.
     */
    destroy() {
        // The draggable element must be unregistered.
        if (this.dragdrop !== undefined) {
            this.dragdrop.unregister();
        }
    }

    /**
     * Validate draggable data.
     *
     * @param {Object} dropdata Drop data from the current drag element.
     * @returns {boolean} if the data is valid for this drop-zone.
     */
    validateDropData(dropdata) {
        // Do not allow element drop to itself.
        if (this.element.id == dropdata.id) {
            this.element.classList.remove(CSS.DROP_ZONE);
            return false;
        }
        return true;
    }

    /**
     * Executed when a valid dropdata is dropped over the drop-zone.
     *
     * @param {Object} dropdata  Drop data from the current drag element.
     */
    drop(dropdata) {
        let dropZoneNode = this.element;
        // If the dropzone is a section. We will drop the first question of the section.
        if (this.element.classList.contains('section')) {
            dropZoneNode = this.element.querySelector(SELECTORS.QUESTION);
        }
        // If the dropzone is a page title. We will drop to next question of the page.
        if (this.element.classList.contains('page')) {
            dropZoneNode = slot.getNext(this.element, SELECTORS.SLOT_SELECTOR);
            if (!dropZoneNode) {
                // If it is first page, we will drop next the first question of the section.
                dropZoneNode = this.element.parentNode.querySelector(SELECTORS.QUESTION);
            }
        }
        if (dropZoneNode) {
            this.reactive.dispatch('moveQuestion', dropdata, dropZoneNode);
        }
    }

    /**
     * Optional method to show some visual hints to the user.
     */
    showDropZone() {
        this.element.classList.add(CSS.DROP_ZONE);
    }

    /**
     * Optional method to remove visual hints to the user.
     */
    hideDropZone() {
        this.element.classList.remove(CSS.DROP_ZONE);
    }
}