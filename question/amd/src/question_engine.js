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
 * JavaScript required by the question engine.
 *
 * @module     core_question/question_engine
 * @copyright  2021 The Open University
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import * as scrollManager from 'core/scroll_manager';
import * as formSubmit from 'core_form/submit';

/**
 * Initialise a question submit button. This saves the scroll position and
 * sets the fragment on the form submit URL so the page reloads in the right place.
 *
 * @param {string} button the id of the button in the HTML.
 */
export const initSubmitButton = button => {
    formSubmit.init(button);
    scrollManager.watchScrollButtonSaves();
};

/**
 * Allow check button to pass value to form.
 *
 * @param {string} elementId the id of the button in the HTML.
 */
export const initCheckButton = elementId => {
    const button = document.getElementById(elementId);
    button.addEventListener('click', function(event) {
        const form = button.closest('form');
        // Add a hidden input so that we can retain the slot of a quiz or preview that are being checked.
        const checkedSlotInput = document.createElement('input');
        checkedSlotInput.type = 'hidden';
        checkedSlotInput.name = 'checkedslot';
        checkedSlotInput.value = event.target.dataset.slot;
        form.appendChild(checkedSlotInput);
    });
};

/**
 * Initialise a form that contains questions printed using print_question.
 * This has the effect of:
 * 1. Turning off browser autocomlete.
 * 2. Stopping enter from submitting the form (or toggling the next flag) unless
 *    keyboard focus is on the submit button or the flag.
 * 3. Removes any '.questionflagsavebutton's, since we have JavaScript to toggle
 *    the flags using ajax.
 * 4. Scroll to the position indicated by scrollpos= in the URL, if it is there.
 * 5. Prevent the user from repeatedly submitting the form.
 *
 * @param {string} formSelector Selector to identify the form.
 */
export const initForm = (formSelector) => {
    const form = document.querySelector(formSelector);
    form.setAttribute('autocomplete', 'off');

    form.addEventListener('submit', preventRepeatSubmission);

    form.addEventListener('key', (event) => {
        if (event.keyCode !== 13) {
            return;
        }

        if (event.target.matches('a')) {
            return;
        }

        if (event.target.matches('input[type="submit"]')) {
            return;
        }

        if (event.target.matches('input[type=img]')) {
            return;
        }

        if (event.target.matches('textarea') || event.target.matches('[contenteditable=true]')) {
            return;
        }

        event.preventDefault();
    });

    const questionFlagSaveButtons = form.querySelectorAll('.questionflagsavebutton');
    [...questionFlagSaveButtons].forEach((node) => node.remove());

    // Note: The scrollToSavedPosition function tries to wait until the content has loaded before firing.
    scrollManager.scrollToSavedPosition();
    announceFeedback(form);
};

/**
 * Event handler to stop a question form being submitted more than once.
 *
 * @param {object} event the form submit event.
 */
export const preventRepeatSubmission = (event) => {
    const form = event.target.closest('form');
    if (form.dataset.formSubmitted === '1') {
        event.preventDefault();
        return;
    }

    setTimeout(() => {
        [...form.querySelectorAll('input[type=submit]')].forEach((input) => input.setAttribute('disabled', true));
    });
    form.dataset.formSubmitted = '1';
};

/**
 * Announce the all feedback to users when the slot are being checked.
 *
 * @param {HTMLElement} form the current form that contain the question that being checked.
 */
const announceFeedback = form => {
    const url = new URL(window.location.href);
    const checkslot = url.searchParams.get('checkedslot');
    setTimeout(function() {
        const checkedQuestion = form.querySelector('.slot-checked-' + checkslot);
        if (checkedQuestion) {
            const feedbackElements = checkedQuestion.querySelectorAll('[aria-live="assertive"]');
            feedbackElements.forEach(function(feedbackElement) {
                // Note: This is a hacky way to make the screen reader think the content are being modified
                // so that the feedback can be announce to the user.
                const html = feedbackElement.innerHTML;
                // Why we need add an extra div for the feedback ?
                // Because if the feedback is purely text, even if we change the innerHTML to empty
                // Then change it back to original feedback, it doesn't count as the feedback is being modified.
                feedbackElement.innerHTML = '<div>' + html + '</div>';
            });
        }
        // The reason why we need to set an delay because on quiz attempt page
        // There is an focus event that causing an interuption when the feedback are being read.
        // So we want to wait for all of event loaded complelely before modified the content of feedback.
    }, 1000);
};