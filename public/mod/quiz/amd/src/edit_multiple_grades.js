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
 * JavaScript for managing multiple grade items for a quiz.
 *
 * @module     mod_quiz/edit_multiple_grades
 * @copyright  2023 The Open University
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {call as fetchMany} from 'core/ajax';
import MoodleConfig from 'core/config';
import {addIconToContainer, addIconToContainerRemoveOnCompletion} from 'core/loadingicon';
import Notification from 'core/notification';
import Pending from 'core/pending';
import {get_string as getString} from 'core/str';
import * as Templates from 'core/templates';
import {prefetchStrings} from 'core/prefetch';
import Fragment from 'core/fragment';

/**
 * @type {Object} selectors used in this code.
 */
const SELECTORS = {
    'addGradeItemButton': '#mod_quiz-add_grade_item',
    'autoSetupButton': '#mod_quiz-grades_auto_setup',
    'editingPageContents': '#edit_grading_page-contents',
    'gradeItemList': 'table#mod_quiz-grade-item-list',
    'gradeItemSelect': 'select[data-slot-id]',
    'gradeItemSelectId': (id) => 'select#grade-item-choice-' + id,
    'gradeItemTr': 'table#mod_quiz-grade-item-list tr[data-quiz-grade-item-id]',
    'inplaceEditable': 'span.inplaceeditable',
    'inplaceEditableOn': 'span.inplaceeditable.inplaceeditingon',
    'resetAllButton': '#mod_quiz-grades_reset_all',
    'slotList': 'table#mod_quiz-slot-list',
    'updateGradeItemLink': (id) => 'tr[data-quiz-grade-item-id="' + id + '"] .quickeditlink',
};

prefetchStrings('mod_quiz', [
    'overallfeedback_for',
    'insertfeedbackbefore',
    'editoverallfeedback',
    'overallfeedback1range',
]);

let totalEditor = {};

/**
 * Call the Ajax service to create a quiz grade item.
 *
 * @param {Number} quizId id of the quiz to update.
 * @returns {Promise<Object>} a promise that resolves to the template context required to re-render the page.
 */
const createGradeItem = (
    quizId,
) => callServiceAndReturnRenderingData({
    methodname: 'mod_quiz_create_grade_items',
    args: {
        quizid: quizId,
        quizgradeitems: [{name: ''}],
    }
});

/**
 * Call the Ajax service to update a quiz grade item.
 *
 * @param {Number} quizId id of the quiz to update.
 * @param {Number} gradeItemId id of the grade item to update.
 * @param {String} newName the new name to set.
 * @return {Promise} Promise that resolves to the context required to re-render the page.
 */
const updateGradeItem = (
    quizId,
    gradeItemId,
    newName
) => callServiceAndReturnRenderingData({
    methodname: 'mod_quiz_update_grade_items',
    args: {
        quizid: quizId,
        quizgradeitems: [{id: gradeItemId, name: newName}],
    }
});

/**
 * Call the Ajax service to delete a quiz grade item.
 *
 * @param {Number} quizId id of the quiz to update.
 * @param {Number} gradeItemId id of the grade item to delete.
 * @return {Promise} Promise that resolves to the context required to re-render the page.
 */
const deleteGradeItem = (
    quizId,
    gradeItemId
) => callServiceAndReturnRenderingData({
    methodname: 'mod_quiz_delete_grade_items',
    args: {
        quizid: quizId,
        quizgradeitems: [{id: gradeItemId}],
    }
});

/**
 * Call the Ajax service to update the quiz grade item used by a slot.
 *
 * @param {Number} quizId id of the quiz to update.
 * @param {Number} slotId id of the slot to update.
 * @param {Number|null} gradeItemId new grade item ot set, or null to un-set.
 * @return {Promise} Promise that resolves to the context required to re-render the page.
 */
const updateSlotGradeItem = (
    quizId,
    slotId,
    gradeItemId
) => callServiceAndReturnRenderingData({
    methodname: 'mod_quiz_update_slots',
    args: {
        quizid: quizId,
        slots: [{id: slotId, quizgradeitemid: gradeItemId}],
    }
});

/**
 * Call the Ajax service to setup one grade item for each quiz section.
 *
 * @param {Number} quizId id of the quiz to update.
 * @return {Promise} Promise that resolves to the context required to re-render the page.
 */
const autoSetupGradeItems = (
    quizId
) => callServiceAndReturnRenderingData({
    methodname: 'mod_quiz_create_grade_item_per_section',
    args: {
        quizid: quizId
    }
});

/**
 * Make a web service call, and also call mod_quiz_get_edit_grading_page_data to get the date to re-render the page.
 *
 * @param {Object} methodCall a web service call to pass to fetchMany. Must include methodCall.args.quizid.
 * @returns {Promise<Object>} a promise that resolves to the template context required to re-render the page.
 */
const callServiceAndReturnRenderingData = (methodCall) => callServicesAndReturnRenderingData([methodCall]);

/**
 * Make a web service call, and also call mod_quiz_get_edit_grading_page_data to get the date to re-render the page.
 *
 * @param {Object[]} methodCalls web service calls to pass to fetchMany. Must include methodCalls[0].args.quizid.
 * @returns {Promise<Object>} a promise that resolves to the template context required to re-render the page.
 */
const callServicesAndReturnRenderingData = (methodCalls) => {
    methodCalls.push({
            methodname: 'mod_quiz_get_edit_grading_page_data',
            args: {
                quizid: methodCalls[0].args.quizid,
            }
        });
    return Promise.all(fetchMany(methodCalls))
    .then(results => JSON.parse(results.at(-1)));
};

/**
 * A function to handle the event of adding overall feedback for each grade item.
 *
 * @param {Event} e click event.
 */
const handleGradeItemAddFeedback = async(e) => {
    e.preventDefault();
    const pending = new Pending('add-overall-feedback');
    const tableCell = e.target.closest('td');
    const tableRow = tableCell.closest('tr');
    const contextId = Number(tableRow.closest('table').dataset.contextId);
    const quizId = tableRow.closest('table').dataset.quizId;
    const gradeItemId = tableRow.dataset.quizGradeItemId;
    // Find the feedback detail row to show the feedback form.
    const feedbackDetailRow = document.querySelector(SELECTORS.gradeItemList + ' #overall-feedback-detail-' + gradeItemId);
    if (!feedbackDetailRow) {
        return;
    }
    // In case the feedback detail row is still hidden, we need to show it.
    if (!feedbackDetailRow.classList.contains('show')) {
        // Trigger the expand button.
        tableRow.querySelector('th span.inplaceeditable a.view-detail').click();
    }
    // Hide the overall feedback detail.
    feedbackDetailRow.querySelector('.wrap-sub-table .wrap-overallfeedback-detail').classList.add('d-none');
    // Show the loading icon while waiting for the feedback form to load.
    addIconToContainerRemoveOnCompletion(feedbackDetailRow.querySelector('.wrap-sub-table'), pending);
    // Load existing overall feedback based on the specific grade item ID.
    // If no feedback exists, display a sample feedback with a boundary of 100%.
    let totalFeedback = 0;
    Fragment.loadFragment('mod_quiz', 'load_overall_feedback_data', contextId, {
        quizId,
        gradeItemId,
    }).then(function(html, js) {
        const feedbackFormEl = feedbackDetailRow.querySelector('.wrap-sub-table .wrap-overallfeedback-form');
        // Set the overall feedback form data into the form.
        feedbackFormEl.innerHTML = html;
        // Then display it.
        feedbackFormEl.classList.remove('d-none');
        // Wait until the HTML is fully appended to the DOM before running the JavaScript code.
        setTimeout(() => {
            Templates.runTemplateJS(js);
        }, 500);
        // Add event for the divider.
        // After the template loads, events need to be added to all dividers to allow users to add more overall feedback.
        feedbackDetailRow
            .querySelector('.wrap-sub-table')
            .querySelectorAll('.divider button.feedbackadd-button')
            .forEach(addFeedback => {
                totalFeedback++;
                // Set a flag to mark that the event has already been attached.
                addFeedback.dataset.eventAttached = 'true';
                addFeedback.addEventListener('click', e => {
                    e.preventDefault();
                    handleAddMoreFeedback(e, feedbackFormEl, contextId);
                });
            });

        // We need to store the total editor for each grade item. This is necessary to create a unique ID for the editor.
        totalEditor[gradeItemId] = totalFeedback;

        // Handle footer button.
        feedbackDetailRow.querySelectorAll('.overallfeedback-footer input')
            .forEach(input => {
                // Add event to handle footer buttons.
                input.addEventListener('click', handleSubmitForm);
                // Enable the cancel and save buttons.
                input.removeAttribute('disabled');

            });

        // Add event for the delete feedback button.
        feedbackDetailRow.querySelectorAll('button[name="delete-feedback"]')
            .forEach(button => {
                // Need to set a flag for each button to indicate if an event is already set.
                button.dataset.deleteEventAttached = 'true';
                button.addEventListener("click", handleDeleteFeedback);
            });

        pending.resolve();
        return true;
    }).catch(Notification.exception);
};

/**
 * A function to handle events when the user tries to click on the remove button in a form.
 *
 * @param {Event} e click event.
 */
const handleDeleteFeedback = e => {
    const feedbackElement = e.currentTarget.closest('[data-groupname="gradeitem-feedback"]');
    const overallFeedbackWrapper = feedbackElement.closest('.wrap-overallfeedback-form');
    const after = Number(feedbackElement.nextElementSibling.querySelector('button.feedbackadd-button').dataset.after);
    // Remove boundary.
    feedbackElement.previousElementSibling.remove();
    // Remove divider element.
    feedbackElement.nextElementSibling.remove();
    // Remove feedback editor.
    feedbackElement.remove();
    // Calculate feedback index again.
    recalculateFeedbackIndex(
        overallFeedbackWrapper,
        after,
        Number(document.querySelector(SELECTORS.gradeItemList).dataset.contextId)
    );
};

/**
 * A function to handle events when the user tries to click on the save or cancel button in a form.
 *
 * @param {Event} e click event.
 */
const handleSubmitForm = (e) => {
    e.preventDefault();
    const target = e.currentTarget;
    const action = target.dataset.action;
    const gradeItemId = parseInt(target.closest('div[data-gradeitem-id]').dataset.gradeitemId);
    switch (action) {
        case 'cancel':
            // Hide the overall feedback form and display the feedback detail section.
            target.closest('.wrap-sub-table')
                ?.querySelector('.wrap-overallfeedback-form').classList.add('d-none');
            target.closest('.wrap-sub-table')
                ?.querySelector('.wrap-overallfeedback-detail').classList.remove('d-none');
            // Collapse the overall feedback section.
            toggleFeedbackDetailElements(gradeItemId, false);
            break;
        case 'save':
            // Validate and then save the feedback.
            saveFeedback(gradeItemId);
            break;
        default:
            break;
    }
};

/**
 * Collapse/Expand the overall feedback detail section.
 *
 * @param {Number} gradeItemID The grade item ID used to identify the area for the required action.
 * @param {Boolean} status Set to True to expand the section or False to collapse it.
 */
const toggleFeedbackDetailElements = (gradeItemID, status) => {
    // Check if the feedback section already matches the requested status.
    // For example, if the section is already expanded and the request is True (to expand), no action is needed.
    if (!document.getElementById('overall-feedback-detail-' + gradeItemID).classList.contains('show') === status) {
        // If the current status does not match the requested status, trigger action.
        document.querySelector(
            SELECTORS.gradeItemList + ` tr[data-quiz-grade-item-id="${gradeItemID}"] > th a.view-detail`)?.click();
    }
};

/**
 * Toggle the status of the footer buttons.
 *
 * @param {Number} gradeItemId Grade item id for feedback.
 * @param {Boolean} status True indicates that the button is disabled.
 */
const updateStatusFooterButton = (gradeItemId, status) => {
    document.getElementById('overall-feedback-detail-' + gradeItemId)
        .querySelectorAll('.overallfeedback-footer input')
        .forEach(inputEl => {
            inputEl.disabled = status;
        });
};

/**
 * Validate the form data and save the feedback if it's valid.
 *
 * @param {Number} gradeItemId The grade item id for the feedback.
 */
const saveFeedback = async(gradeItemId) => {
    // Browse through every element in the form and collect them into an object.
    const formData = collectFormData(gradeItemId);
    updateStatusFooterButton(gradeItemId, true);
    const options = {
        methodname: 'mod_quiz_save_overall_feedback_per_grade_item',
        args: {
            formdata: JSON.stringify(formData),
            quizid: parseInt(document.querySelector(SELECTORS.gradeItemList).dataset.quizId),
            gradeitemid: gradeItemId,
        },
    };

    try {
        // Validate form data and save it.
        const result = await fetchMany([options])[0];
        // Toggle error messages.
        const errors = JSON.parse(result.errors);
        displayErrors(gradeItemId, errors);
        // If the form data is valid.
        if (errors.length === 0) {
            // Update icon and title for the menu-item.
            // Since the page does not reload, we must change it manually.
            const gradeItemRow = document.querySelector(SELECTORS.gradeItemList +
                ` tr[data-quiz-grade-item-id="${gradeItemId}"]`);
            const addOverallFeedbackMenu = gradeItemRow
                .querySelector('.moodle-actionmenu a.dropdown-item[data-action-add-feedback]');
            const {key, title, titleLevelFeedback} = await getIconFeedback(parseInt(result.total));
            const icon = await Templates.renderPix(key, 'core', title);
            addOverallFeedbackMenu.innerHTML = icon + title;
            gradeItemRow.querySelector('td.total-overallfeedback').innerText = titleLevelFeedback;
            if (parseInt(result.total) === 0) {
                // Since there is no existing feedback for this grade item ID,
                // we need to collapse the feedback detail element if it is expanded.
                toggleFeedbackDetailElements(gradeItemId, false);
                // The user has removed all feedback, so the expanded icon will be hidden.
                gradeItemRow.querySelector(SELECTORS.inplaceEditable)
                    ?.querySelector('a.view-detail:not(.invisible)')?.classList?.add('invisible');
            } else {
                // Feedback exists, so we need to display the expanded icon.
                gradeItemRow.querySelector(SELECTORS.inplaceEditable)
                    ?.querySelector('a.invisible')?.classList?.remove('invisible');
                // Load detail feedback.
                const pending = new Pending('updating-feedback-detail');
                const feedbackWrapElement = document.getElementById('overall-feedback-detail-' + gradeItemId);
                addIconToContainerRemoveOnCompletion(feedbackWrapElement.querySelector('.wrap-sub-table'), pending);
                Fragment.loadFragment('mod_quiz', 'load_overall_feedback_detail',
                    Number(document.querySelector(SELECTORS.gradeItemList).dataset.contextId),
                    {
                        quizId: parseInt(document.querySelector(SELECTORS.gradeItemList).dataset.quizId),
                        gradeItemId,
                    }).then(function(html) {
                    feedbackWrapElement.querySelector('.wrap-overallfeedback-detail').innerHTML = html;
                    // Hide the overall feedback form and display the feedback detail section.
                    feedbackWrapElement.querySelector('.wrap-overallfeedback-form').classList.add('d-none');
                    // To prevent any unnecessary browser alerts during refresh, we need to destroy the feedback form.
                    feedbackWrapElement.querySelector('.wrap-overallfeedback-form').innerHTML = '';
                    // Display the detailed feedback.
                    feedbackWrapElement.querySelector('.wrap-overallfeedback-detail').classList.remove('d-none');
                    pending.resolve();
                    return true;
                }).catch(Notification.exception);
            }
        }
        updateStatusFooterButton(gradeItemId, false);
    } catch (e) {
        updateStatusFooterButton(gradeItemId, false);
        Notification.exception(e);
    }
};

/**
 * Prepare the type icon and title before rendering the icon for updating menu items in the overall feedback dropdown list.
 *
 * @param {Number} totalFeedback Number of feedback entries in the grade item.
 * @returns {Object} Return type of icon and title.
 */
const getIconFeedback = async(totalFeedback) => {
    if (totalFeedback > 0) {
        return {
            key: 't/edit',
            title: await getString('editoverallfeedback', 'quiz'),
            titleLevelFeedback: totalFeedback === 1 ?
                await getString('overallfeedback1range', 'quiz', totalFeedback) :
                await getString('overallfeedbacknranges', 'quiz', totalFeedback)
        };
    }
    return {
        key: 't/add',
        title: await getString('addoverallfeedback', 'quiz'),
        titleLevelFeedback: '-'
    };
};


/**
 * Display error messages for every form element that exists in the errors object.
 *
 * @param {Number} gradeItemId The grade item id for feedback.
 * @param {Object} errors Errors object.
 */
const displayErrors = (gradeItemId, errors) => {
    const feedbackForm = document.getElementById('overall-feedback-detail-' + gradeItemId);
    let feedbackTextIndex = 0;

    // We need to go through all the input elements to display error messages
    // for invalid inputs and clear error messages for valid ones.
    feedbackForm.querySelectorAll('form .fitem').forEach(el => {
        // Check the container type. It can be static, text (boundaries), or editor (feedback).
        const type = el.querySelector('[data-fieldtype]')?.dataset?.fieldtype;
        switch (type) {
            case 'text': {
                const inputBoundary = el.querySelector('input[name^="feedbackboundaries"]');
                const errorText = errors[inputBoundary.name];
                const feedback = inputBoundary.closest('.felement').querySelector('.invalid-feedback');
                if (errorText) {
                    // If an error occurs with the feedback boundaries input, we need to display an error message.
                    inputBoundary.classList.add('is-invalid');
                    inputBoundary.setAttribute('autofocus', true);
                    feedback.classList.add('d-block');
                    feedback.innerText = errorText;
                    inputBoundary.setAttribute('aria-describedby', feedback.id);
                } else {
                    // If the feedback boundaries input is valid, we need to remove the error message.
                    inputBoundary.classList.remove('is-invalid');
                    inputBoundary.removeAttribute('autofocus');
                    feedback.classList.remove('d-block');
                    feedback.innerText = '';
                }
            }
                break;
            case 'editor': {
                const textAreaFeedback = el.querySelector('textarea[name^="feedbacktext"]');
                // Skip the first editor when the boundary is 100%.
                if (textAreaFeedback.id === 'id_feedbacktext_0_text') {
                    break;
                }
                const errorText = errors[`feedbacktext[${feedbackTextIndex}]`];
                const feedbackEl = el.querySelector('.invalid-feedback');
                if (errorText) {
                    feedbackEl.innerText = errorText;
                    feedbackEl.classList.add('d-block');
                } else {
                    feedbackEl.innerText = '';
                    feedbackEl.classList.remove('d-block');
                }
                feedbackTextIndex++;
            }
                break;
            default:
                break;
        }
    });
};

/**
 * Collect form data in overall feedback form.
 *
 * @param {Number} gradeItemId Grade item id for feedback.
 * @return {Array} Form data array.
 */
const collectFormData = (gradeItemId) => {
    const formData = [];
    let itemData = {};
    // Since every time a user adds more feedback, a new form is appended to the form,
    // leading to more than one form existing in the form, we need to query all the forms in the form
    // and loop through them to collect the form data.
    const forms = document.getElementById('overall-feedback-detail-' + gradeItemId)
        .querySelectorAll('.wrap-overallfeedback-form form');
    forms.forEach(form => {
        [...(new FormData(form)).entries()].forEach((arr) => {
            // Retrieve the name and value of form inputs.
            // Only collect feedback boundaries and feedback text.
            const [key, value] = arr;
            // Since the name of the boundaries input follows the format like feedbackboundaries[0],
            // we need to use regex to detect it.
            if (/^feedbackboundaries/.test(key)) {
                itemData.boundary = value.trim();
            }
            // The feedback differs from the boundaries when it is a text editor,
            // so we need to collect the text, format type, and item ID.
            if (/^feedbacktext/.test(key)) {
                // The name of the editor follows the format feedbacktext[1][40][text], feedbacktext[1][40][format],
                // feedbacktext[1][40][itemid].
                // This regex will return an array containing 3 items like [1, 40, "[text]"].
                // Then, remove the characters [ and ] from the last item to retrieve the editor type.
                const type = key.match(/\[(.*?)]/g).pop().slice(1, -1);
                if (!itemData.feedback) {
                    itemData.feedback = {};
                }
                itemData.feedback[type] = value.trim();
            }
            if (Object.keys(itemData.feedback ?? {}).length === 3) {
                // By default, the first boundary value is 100%, and it's only a label so that we can't get it in form data,
                // so we need to set a default value (it's just sample data. It doesn't need to be true grade data.)
                // for the first boundary data.
                itemData.boundary = itemData.boundary ?? "100%";
                formData.push({...itemData});
                itemData = {};
            }
        });
    });

    return formData;
};

/**
 * A function to handle adding more feedback in the overall feedback form.
 *
 * @param {Event} e click event.
 * @param {HTMLElement} overallFeedbackWrapper The wrapper element for the form.
 * @param {Number} contextId Context id number.
 */
const handleAddMoreFeedback = async(e, overallFeedbackWrapper, contextId) => {
    const {after} = e.currentTarget.dataset;
    const gradeItemId = parseInt(overallFeedbackWrapper.closest('[data-gradeitem-id]').dataset.gradeitemId);
    // Load a new feedback form and append it to the current form.
    // Since there is no alternative method available, we will use the load fragment approach to load the new form.
    Fragment.loadFragment('mod_quiz', 'load_overall_feedback_form', contextId, {
        after,
        // The "no" parameter represents the total number of editors that currently exist for this grade item.
        // This is necessary to generate a unique ID for creating a new editor to prevent duplication,
        // the total count of editors is used as a unique identifier for the new editor.
        no: totalEditor[gradeItemId],
        gradeitemid: gradeItemId,
    }).then(function(html, js) {
         // Append the new editor to the current form, placing it directly after the divider element.
        overallFeedbackWrapper.querySelector(`.divider button[data-after="${after}"]`)
            .closest('.divider').insertAdjacentHTML('afterend', html);
        Templates.runTemplateJS(js);
        // Need to increase the total editor exist in this grade item to help make a unique id for the next editor.
        totalEditor[gradeItemId]++;
        recalculateFeedbackIndex(overallFeedbackWrapper, after, contextId);
        return true;
    }).catch(Notification.exception);
};

/**
 * Every time a new feedback is added to the form, we need to calculate the order number and update it for all elements.
 *
 * @param {HTMLElement} overallFeedbackWrapper The wrapper element for the form.
 * @param {Number} after The order number used to detect the position to add new feedback.
 * @param {Number} contextId Context id number.
 */
const recalculateFeedbackIndex = (overallFeedbackWrapper, after, contextId) => {
    const gradeBoundaryEls = overallFeedbackWrapper.querySelectorAll('input[name^="feedbackboundaries"]');
    const dividerButtonEls = overallFeedbackWrapper.querySelectorAll('.divider button');
    const deleteButtonEls = overallFeedbackWrapper.querySelectorAll('button[name="delete-feedback"]');
    gradeBoundaryEls.forEach((el, key) => {
        if (key >= after) {
            // Re-update id or label for every element.
            const wrapItem = el.closest('.fitem');
            const label = wrapItem.querySelector('label[id^="id_feedbackboundaries_"]');
            const inputBoundary = wrapItem.querySelector('input[name^="feedbackboundaries"]');
            wrapItem.id = 'fitem_id_feedbackboundaries_' + key;
            label.id = `id_feedbackboundaries_${key}_label`;
            label.setAttribute('for', `id_feedbackboundaries_${key}`);
            inputBoundary.id = 'id_feedbackboundaries_' + key;
            inputBoundary.name = `feedbackboundaries[${key}]`;
            wrapItem.querySelector('.invalid-feedback').id = 'id_error_feedbackboundaries_' + key;
        }
    });

    // Re-update devider.
    dividerButtonEls.forEach((el, key) => {
        el.dataset.after = key;
        getString('insertfeedbackbefore', 'mod_quiz', {afterindex: key}).then(string => {
            el.setAttribute('aria-label', string);
            return true;
        }).catch(() => {
            return false;
        });
        // Add event for the new divider that was just loaded.
        if (el.dataset.eventAttached === 'false') {
            // Set a flag if the button already has an event added.
            el.dataset.eventAttached = 'true';
            el.addEventListener('click', e => {
                e.preventDefault();
                handleAddMoreFeedback(e, overallFeedbackWrapper, contextId);
            });
        }
    });

    // Add event for delete button just append to form.
    deleteButtonEls.forEach((el) => {
        // Add event for the new divider that was just loaded.
        if (el.dataset?.deleteEventAttached === undefined) {
            // Set a flag if the button already has an event added.
            el.dataset.deleteEventAttached = 'true';
            el.addEventListener('click', e => {
                e.preventDefault();
                handleDeleteFeedback(e);
            });
        }
    });
};

/**
 * Handle click events on the delete icon.
 *
 * @param {Event} e click event.
 */
const handleGradeItemDelete = (e) => {
    e.preventDefault();
    const pending = new Pending('delete-quiz-grade-item');

    const tableCell = e.target.closest('td');
    addIconToContainer(tableCell, pending);

    const tableRow = tableCell.closest('tr');
    const quizId = tableRow.closest('table').dataset.quizId;
    const gradeItemId = tableRow.dataset.quizGradeItemId;

    let nextItemToFocus;
    if (tableRow.nextElementSibling) {
        nextItemToFocus = SELECTORS.updateGradeItemLink(tableRow.nextElementSibling.dataset.quizGradeItemId);
    } else {
        nextItemToFocus = SELECTORS.addGradeItemButton;
    }

    deleteGradeItem(quizId, gradeItemId)
        .then(reRenderPage)
        .then(() => {
            pending.resolve();
            document.querySelector(nextItemToFocus)?.focus();
            return true;
        })
        .catch(Notification.exception);
};

/**
 *
 * @param {HTMLElement} editableSpan the editable to turn off.
 */
const stopEditingGadeItem = (editableSpan) => {
    editableSpan.innerHTML = editableSpan.dataset.oldContent;
    delete editableSpan.dataset.oldContent;

    editableSpan.classList.remove('inplaceeditingon');
    editableSpan.querySelector('[data-action-edit]').focus();
};

/**
 * Handle click events on the start rename icon.
 *
 * @param {Event} e click event.
 */
const handleGradeItemEditStart = (e) => {
    e.preventDefault();
    const pending = new Pending('edit-quiz-grade-item-start');
    const editableSpan = e.target.closest(SELECTORS.inplaceEditable);

    document.querySelectorAll(SELECTORS.inplaceEditableOn).forEach(stopEditingGadeItem);

    editableSpan.dataset.oldContent = editableSpan.innerHTML;
    getString('edittitleinstructions')
        .then((instructions) => {
            const uniqueId = 'gi-edit-input-' + editableSpan.closest('tr').dataset.quizGradeItemId;
            editableSpan.innerHTML = '<span class="editinstructions">' + instructions + '</span>' +
                    '<label class="visually-hidden" for="' + uniqueId + '">' + editableSpan.dataset.editLabel + '</label>' +
                    '<input type="text" id="' + uniqueId + '" value="' + editableSpan.dataset.rawName +
                            '" class="ignoredirty form-control w-100">';

            const inputElement = editableSpan.querySelector('input');
            inputElement.focus();
            inputElement.select();
            editableSpan.classList.add('inplaceeditingon');
            pending.resolve();
            return null;
        })
        .catch(Notification.exception);
};

/**
 * Handle key down in the editable.
 *
 * @param {Event} e key event.
 */
const handleGradeItemKeyDown = (e) => {
    if (e.keyCode !== 13) {
        return;
    }

    const editableSpan = e.target.closest(SELECTORS.inplaceEditableOn);

    // Check this click is on a relevant element.
    if (!editableSpan || !editableSpan.closest(SELECTORS.gradeItemList)) {
        return;
    }

    e.preventDefault();
    const pending = new Pending('edit-quiz-grade-item-save');

    const newName = editableSpan.querySelector('input').value;
    const tableCell = e.target.closest('th');
    addIconToContainer(tableCell);

    const tableRow = tableCell.closest('tr');
    const quizId = tableRow.closest('table').dataset.quizId;
    const gradeItemId = tableRow.dataset.quizGradeItemId;

    updateGradeItem(quizId, gradeItemId, newName)
        .then(reRenderPage)
        .then(() => {
            pending.resolve();
            document.querySelector(SELECTORS.updateGradeItemLink(gradeItemId)).focus({'focusVisible': true});
        })
        .catch(Notification.exception);
};

/**
 * Replace the contents of the page with the page re-rendered from the provided data, once that promise resolves.
 *
 * @param {Object} editGradingPageData the template context data required to re-render the page.
 * @returns {Promise<void>} a promise that will resolve when the page is updated.
 */
const reRenderPage = (editGradingPageData) =>
    Templates.render('mod_quiz/edit_grading_page', editGradingPageData)
        .then((html, js) => Templates.replaceNode(document.querySelector(SELECTORS.editingPageContents), html, js || ''));

/**
 * Handle key up in the editable.
 *
 * @param {Event} e key event.
 */
const handleGradeItemKeyUp = (e) => {
    if (e.keyCode !== 27) {
        return;
    }

    const editableSpan = e.target.closest(SELECTORS.inplaceEditableOn);

    // Check this click is on a relevant element.
    if (!editableSpan || !editableSpan.closest(SELECTORS.gradeItemList)) {
        return;
    }

    e.preventDefault();
    stopEditingGadeItem(editableSpan);
};

/**
 * Handle focus out of the editable.
 *
 * @param {Event} e event.
 */
const handleGradeItemFocusOut = (e) => {
    if (MoodleConfig.behatsiterunning) {
        // Behat triggers focusout too often so ignore.
        return;
    }

    const editableSpan = e.target.closest(SELECTORS.inplaceEditableOn);

    // Check this click is on a relevant element.
    if (!editableSpan || !editableSpan.closest(SELECTORS.gradeItemList)) {
        return;
    }

    e.preventDefault();
    stopEditingGadeItem(editableSpan);
};

/**
 * Handle when the selected grade item for a slot is changed.
 *
 * @param {Event} e event.
 */
const handleSlotGradeItemChanged = (e) => {
    const select = e.target.closest(SELECTORS.gradeItemSelect);

    // Check this click is on a relevant element.
    if (!select || !select.closest(SELECTORS.slotList)) {
        return;
    }

    e.preventDefault();
    const pending = new Pending('edit-slot-grade-item-updated');

    const slotId = select.dataset.slotId;
    const newGradeItemId = select.value ? select.value : null;
    const tableCell = e.target.closest('td');
    addIconToContainer(tableCell, pending);

    const quizId = tableCell.closest('table').dataset.quizId;

    updateSlotGradeItem(quizId, slotId, newGradeItemId)
        .then(reRenderPage)
        .then(() => {
            pending.resolve();
            document.querySelector(SELECTORS.gradeItemSelectId(slotId)).focus();
        })
        .catch(Notification.exception);
};

/**
 * Handle clicks in the table the shows the grade items.
 *
 * @param {Event} e click event.
 */
const handleGradeItemClick = (e) => {
    const link = e.target.closest('a');

    // Check this click is on a relevant element.
    if (!link || !link.closest(SELECTORS.gradeItemList)) {
        return;
    }

    if (link.dataset.actionDelete) {
        handleGradeItemDelete(e);
    }

    if (link.dataset.actionEdit) {
        handleGradeItemEditStart(e);
    }

    if (link.dataset.actionAddFeedback) {
        handleGradeItemAddFeedback(e);
    }

    if (link.dataset.actionViewFeedback) {
        handleGradeItemViewFeedback(e);
    }
};

/**
 * Handle clicks on view overall feedback detail.
 *
 * @param {Event} e click event.
 */
const handleGradeItemViewFeedback = (e) => {
    e.preventDefault();
    const target = e.target.closest('a');
    const action = target.dataset.actionViewFeedback === "0";
    toggleFeedbackDetail(target, action);
};

/**
 * Toggle to show or hide the expand/collapse icon for the overall feedback details.
 *
 * @param {HTMLElement} target The target element to toggle the class.
 * @param {Boolean} action The action to trigger: true for expand and false for collapse.
 */
const toggleFeedbackDetail = (target, action) => {
    const targetClass = action ? '.collapsed-icon' : '.expanded-icon';
    target.querySelector(`span.icon:not(${targetClass})`).classList.add('d-none');
    target.querySelector(`${targetClass}`).classList.remove('d-none');
    target.dataset.actionViewFeedback = action ? '1' : '0';
};

/**
 * Handle clicks on the buttons.
 *
 * @param {Event} e click event.
 */
const handleButtonClick = (e) => {
    if (e.target.closest(SELECTORS.addGradeItemButton)) {
        handleAddGradeItemClick(e);
    }
    if (e.target.closest(SELECTORS.autoSetupButton)) {
        handleAutoSetup(e);
    }
    if (e.target.closest(SELECTORS.resetAllButton)) {
        handleResetAllClick(e);
    }
};

/**
 * Handle clicks on the 'Add grade item' button.
 *
 * @param {Event} e click event.
 */
const handleAddGradeItemClick = (e) => {
    e.preventDefault();
    const pending = new Pending('create-quiz-grade-item');
    addIconToContainer(e.target.parentNode, pending);

    const quizId = e.target.dataset.quizId;

    createGradeItem(quizId)
        .then(reRenderPage)
        .then(() => {
            pending.resolve();
            document.querySelector(SELECTORS.addGradeItemButton).focus();
        })
        .catch(Notification.exception);
};

/**
 * Handle clicks on the reset button - show a confirmation.
 *
 * @param {Event} e click event.
 */
const handleAutoSetup = (e) => {
    e.preventDefault();
    const pending = new Pending('setup-quiz-grade-items');

    const quizId = e.target.dataset.quizId;

    autoSetupGradeItems(quizId)
        .then(reRenderPage)
        .then(() => {
            pending.resolve();
            document.querySelector(SELECTORS.resetAllButton).focus();
        })
        .catch(Notification.exception);
};

/**
 * Handle clicks on the reset button - show a confirmation.
 *
 * @param {Event} e click event.
 */
const handleResetAllClick = (e) => {
    e.preventDefault();
    const button = e.target;

    Notification.deleteCancelPromise(
        getString('gradeitemsremoveallconfirm', 'quiz'),
        getString('gradeitemsremoveallmessage', 'quiz'),
        getString('reset'),
        button
    ).then(() => reallyResetAll(button))
    .catch(() => button.focus());
};

/**
 * Really reset all if the confirmation is OKed.
 *
 * @param {HTMLElement} button the reset button.
 */
const reallyResetAll = (button) => {
    const pending = new Pending('reset-quiz-grading');
    addIconToContainer(button.parentNode, pending);

    const quizId = button.dataset.quizId;

    let methodCalls = [];

    // Call to clear any assignments of grade items to slots (if required).
    const slotResets = [...document.querySelectorAll(SELECTORS.gradeItemSelect)].map(
            (select) => ({
                id: select.dataset.slotId,
                quizgradeitemid: 0,
            }));
    if (slotResets.length) {
        methodCalls.push({
            methodname: 'mod_quiz_update_slots',
            args: {
                quizid: quizId,
                slots: slotResets
            }
        });
    }

    // Request to delete all the grade items.
    methodCalls.push({
        methodname: 'mod_quiz_delete_grade_items',
        args: {
            quizid: quizId,
            quizgradeitems: [...document.querySelectorAll(SELECTORS.gradeItemTr)].map((tr) => {
                return {id: tr.dataset.quizGradeItemId};
            })
        }
    });

    callServicesAndReturnRenderingData(methodCalls)
        .then(reRenderPage)
        .then(() => {
            pending.resolve();
            document.querySelector(SELECTORS.addGradeItemButton).focus();
        })
        .catch(Notification.exception);
};

/**
 * Replace the container with a new version.
 */
const registerEventListeners = () => {
    document.body.addEventListener('click', handleGradeItemClick);
    document.body.addEventListener('keydown', handleGradeItemKeyDown);
    document.body.addEventListener('keyup', handleGradeItemKeyUp);
    document.body.addEventListener('focusout', handleGradeItemFocusOut);

    document.body.addEventListener('click', handleButtonClick);

    document.body.addEventListener('change', handleSlotGradeItemChanged);
};

/**
 * Entry point.
 */
export const init = () => {
    registerEventListeners();
};
