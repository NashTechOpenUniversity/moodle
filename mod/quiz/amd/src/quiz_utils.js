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
 * Render the question slot template for each question in the quiz edit view.
 *
 * @module     mod_quiz/quiz_utils
 * @copyright  2024 The Open University.
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

const slot = {
    CSS: {
        SLOT: 'slot',
        QUESTIONTYPEDESCRIPTION: 'qtype_description',
        CANNOT_DEPEND: 'question_dependency_cannot_depend'
    },
    CONSTANTS: {
        SLOTIDPREFIX: 'slot-',
        QUESTION: M.util.get_string('question', 'moodle')
    },
    SELECTORS: {
        SLOT: 'li.slot',
        INSTANCENAME: '.instancename',
        NUMBER: 'span.slotnumber',
        PAGECONTENT: 'div#page-content',
        PAGEBREAK: 'span.page_split_join_wrapper',
        ICON: '.icon',
        QUESTIONTYPEDESCRIPTION: '.qtype_description',
        SECTIONUL: 'ul.section',
        DEPENDENCY_WRAPPER: '.question_dependency_wrapper',
        DEPENDENCY_LINK: '.question_dependency_wrapper .cm-edit-action',
        DEPENDENCY_ICON: '.question_dependency_wrapper .icon'
    },
    /**
     * Determines the slot ID for the provided slot.
     *
     * @method getId
     * @param slot {Element} The slot to find an ID for.
     * @return {Number|false} The ID of the slot in question or false if no ID was found.
     */
    getId: function(slot) {
        // We perform a simple substitution operation to get the ID.
        let id = slot.id.replace(
            this.CONSTANTS.SLOTIDPREFIX, '');

        // Attempt to validate the ID.
        id = parseInt(id, 10);
        if (typeof id === 'number' && isFinite(id)) {
            return id;
        }
        return false;
    },

    createElement: function(tag, attributes) {
        const element = document.createElement(tag);
        
    }
};

export {
    slot,
};