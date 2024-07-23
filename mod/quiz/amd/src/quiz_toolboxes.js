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
 * Manage all toolbox in the quiz question edit page.
 *
 * @module     mod_quiz/quiz_toolboxes
 * @copyright  2024 The Open University.
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {call as fetchMany} from 'core/ajax';
import {getString, getStrings} from 'core/str';
import Prefetch from 'core/prefetch';
import {slot, util, page} from 'mod_quiz/quiz_utils';
import Notification from 'core/notification';
import {addIconToContainerWithPromise} from 'core/loadingicon';
import {eventTypes as inplaceEditableEvents} from 'core/local/inplace_editable/events';

// The CSS classes we use.
const CSS = {
        ACTIVITYINSTANCE: 'activityinstance',
        AVAILABILITYINFODIV: 'div.availabilityinfo',
        CONTENTWITHOUTLINK: 'contentwithoutlink',
        CONDITIONALHIDDEN: 'conditionalhidden',
        DIMCLASS: 'dimmed',
        DIMMEDTEXT: 'dimmed_text',
        EDITINSTRUCTIONS: 'editinstructions',
        EDITINGMAXMARK: 'editor_displayed',
        HIDE: 'hide',
        JOIN: 'page_join',
        MODINDENTCOUNT: 'mod-indent-',
        MODINDENTHUGE: 'mod-indent-huge',
        PAGE: 'page',
        SECTIONHIDDENCLASS: 'hidden',
        SECTIONIDPREFIX: 'section-',
        SELECTMULTIPLE: 'select-multiple',
        SLOT: 'slot',
        SHOW: 'editing_show',
        TITLEEDITOR: 'titleeditor'
    },
    // The CSS selectors we use.
    SELECTOR = {
        ACTIONAREA: '.actions',
        ACTIONLINKTEXT: '.actionlinktext',
        ACTIVITYACTION: 'a.cm-edit-action[data-action], a.editing_maxmark, a.editing_section, input.shuffle_questions',
        ACTIVITYFORM: 'span.instancemaxmarkcontainer form',
        ACTIVITYINSTANCE: '.' + CSS.ACTIVITYINSTANCE,
        SECTIONINSTANCE: '.sectioninstance',
        ACTIVITYLI: 'li.activity, li.section',
        ACTIVITYMAXMARK: 'input[name=maxmark]',
        COMMANDSPAN: '.commands',
        CONFIGTOOLBOX: '.config-toolbox',
        CONTENTAFTERLINK: 'div.contentafterlink',
        CONTENTWITHOUTLINK: 'div.contentwithoutlink',
        DELETESECTIONICON: 'a.editing_delete .icon',
        EDITMAXMARK: 'a.editing_maxmark',
        EDITSECTION: 'a.editing_section',
        EDITSECTIONICON: 'a.editing_section .icon',
        EDITSHUFFLEQUESTIONSACTION: 'input.cm-edit-action[data-action]',
        EDITSHUFFLEAREA: '.instanceshufflequestions .shuffle-progress',
        HIDE: 'a.editing_hide',
        HIGHLIGHT: 'a.editing_highlight',
        INSTANCENAME: 'span.instancename',
        INSTANCEMAXMARK: 'span.instancemaxmark',
        INSTANCESECTION: 'span.instancesection',
        INSTANCESECTIONAREA: 'div.section-heading',
        MAXMARKCONTAINER: '.instancemaxmarkcontainer',
        MODINDENTDIV: '.mod-indent',
        MODINDENTOUTER: '.mod-indent-outer',
        NUMQUESTIONS: '.numberofquestions',
        PAGECONTENT: 'div#page-content',
        PAGELI: 'li.page',
        SECTIONLI: 'li.section',
        SECTIONUL: 'ul.section',
        SECTIONFORM: '.instancesectioncontainer form',
        SECTIONINPUT: 'input[name=section]',
        SELECTMULTIPLEBUTTON: '#selectmultiplecommand',
        SELECTMULTIPLECANCELBUTTON: '#selectmultiplecancelcommand',
        SELECTMULTIPLECHECKBOX: '.select-multiple-checkbox',
        SELECTMULTIPLEDELETEBUTTON: '#selectmultipledeletecommand',
        SELECTALL: '#questionselectall',
        SHOW: 'a.' + CSS.SHOW,
        SLOTLI: 'li.slot',
        SUMMARKS: '.mod_quiz_summarks'
    },
    BODY = document.body;

Prefetch.prefetchStrings('quiz',
    ['numquestionsx', 'cannotremoveslots', 'cannotremoveallsectionslots', 'confirmremovequestion',
        'confirmremovesectionheading', 'sectionnoname', 'sectionnoname', 'sectionheadingedit', 'sectionheadingedit',
        'sectionheadingremove', 'sectionheadingremove', 'areyousureremoveselected']);

Prefetch.prefetchStrings('moodle', ['edittitleinstructions', 'confirm',
    'yes', 'confirm', 'edittitleinstructions']);

/**
 * Resource and activity toolbox class.
 *
 * This class is responsible for managing AJAX interactions with activities and resources
 * when viewing a course in editing mode.
 */
class ToolBox {
    config = {};
    quizId = 0;
    courseId = 0;

    constructor(config, courseId, quizId) {
        this.config = config;
        this.courseId = courseId;
        this.quizId = quizId;
    }
    /**
     * Send a request using the REST API
     *
     * @param {Object} data The data to submit with the AJAX request
     * @param {HTMLElement} [loadingElement] A element that need to be added spinner.
     * @param {String} methodName The service name.
     * @param {Object} [optionalConfig] Any additional configuration to submit
     * @chainable
     */
    sendRequest(data, loadingElement, methodName, optionalConfig) {
        const parameters = {
            methodname: methodName,
            args: data,
        };

        // Apply optional config
        if (optionalConfig) {
            for (let varName in optionalConfig) {
                config[varName] = optionalConfig[varName];
            }
        }
        let spinner = null;

        if (loadingElement !== null) {
            spinner = addIconToContainerWithPromise(loadingElement);
        }

        return fetchMany([parameters])[0].then(response => {
            if (spinner !== null) {
                spinner.resolve();
            }

            if (response.newnumquestions) {
                getString('numquestionsx', 'quiz', response.newnumquestions).then(string => {
                    document.querySelector(SELECTOR.NUMQUESTIONS).innerHTML = string;
                    return true;
                }).catch(() => {
                    // Can't get lang string.
                });
            }
            if (response.newsummarks) {
                document.querySelector(SELECTOR.SUMMARKS).innerHTML = response.newsummarks;
            }

            return response;
        });
    }
}

/**
 * Resource and activity toolbox class.
 *
 * This is a class extending TOOLBOX containing code specific to resources
 *
 * This class is responsible for managing AJAX interactions with activities and resources
 * when viewing a quiz in editing mode.
 */
class ResourceToolBox extends ToolBox {
    courseId = 0;
    quizId = 0;
    config = {};

    /**
     * An Array of events added when editing a max mark field.
     * These should all be detached when editing is complete.
     */
    editMaxMarkEvents = false;

    constructor(courseId, quizId, addEvent) {
        const config = JSON.parse(document.querySelector(SELECTOR.CONFIGTOOLBOX).dataset.config);
        super(config, courseId, quizId);
        this.courseId = courseId;
        this.quizId = quizId;
        this.config = config;
        if (addEvent) {
            BODY.addEventListener('click', (event) => {
                // Use event.target.closest to ensure event delegation works
                if (event.target.closest(SELECTOR.ACTIVITYACTION) ||
                    event.target.closest(SELECTOR.DEPENDENCY_LINK)) {
                    this.handleDataAction(event);
                }
            });
            this.handleQuestionNumberUpdate();
            this.initialiseSelectMultiple();
        }
    }

    /**
     * Initialize the select multiple options
     * Add actions to the buttons that enable multiple slots to be selected and managed at once.
     *
     * @protected
     */
    initialiseSelectMultiple() {
        const body = document.body;

        // Click select multiple button to show the select all options.
        document.querySelector(SELECTOR.SELECTMULTIPLEBUTTON).addEventListener('click', function(e) {
            e.preventDefault();
            body.classList.add(CSS.SELECTMULTIPLE);
        });

        // Click cancel button to hide the select all options.
        document.querySelector(SELECTOR.SELECTMULTIPLECANCELBUTTON).addEventListener('click', function(e) {
            e.preventDefault();
            body.classList.remove(CSS.SELECTMULTIPLE);
        });

        // Assign the delete method to the delete multiple button.
        body.addEventListener('click', function(e) {
            if (e.target.closest(SELECTOR.SELECTMULTIPLEDELETEBUTTON)) {
                this.deleteMultipleAction(e);
            }
        }.bind(this));
    }

    /**
     * Add data-attribute with slot number to inplace element when they are updated.
     */
    handleQuestionNumberUpdate() {
        // Listen to the updated inplace editable event when user updates the question number.
        BODY.addEventListener(inplaceEditableEvents.elementUpdated, function(e) {
            if (e.target.parentNode.classList.contains('slotnumber')) {
                e.target.parentNode.setAttribute('data-customnumber', e.detail.ajaxreturn.displayvalue);
            }
        });
    }

    /**
     * Handles the delegation event. When this is fired someone has triggered an action.
     *
     * Note not all actions will result in an AJAX enhancement.
     *
     * @param {Event} ev The event that was triggered.
     * @returns {boolean}
     */
    handleDataAction(ev) {
        // We need to get the anchor element that triggered this event.
        let node = ev.target;
        if (!(this.isATag(node))) {
            node = node.closest(SELECTOR.ACTIVITYACTION);
        }

        // From the anchor we can get both the activity (added during initialisation) and the action being
        // performed (added by the UI as a data attribute).
        const action = node.dataset.action,
            activity = node.closest(SELECTOR.ACTIVITYLI);

        if (!(this.isATag(node)) || !action || !activity) {
            // It wasn't a valid action node.
            return;
        }

        // Switch based upon the action and do the desired thing.
        switch (action) {
            case 'editmaxmark':
                // The user wishes to edit the max mark of the resource.
                this.editMaxMark(ev, node, activity);
                break;
            case 'delete':
                // The user is deleting the activity.
                this.deleteWithConfirmation(ev, node, activity, action);
                break;
            case 'addpagebreak':
            case 'removepagebreak':
                // The user is adding or removing a page break.
                this.updatePageBreak(ev, node, activity, action);
                break;
            case 'adddependency':
            case 'removedependency':
                // The user is adding or removing a dependency between questions.
                this.updateDependency(ev, node, activity, action);
                break;
            default:
                // Nothing to do here!
                break;
        }
    }

    isATag(node) {
        return node.tagName.toLowerCase() === 'a';
    }

    /**
     * Edit the max mark for the resource.
     *
     * @param {Event} ev The event that was fired.
     * @param {HTMLElement} button The button that triggered this action.
     * @param {HTMLElement} activity The activity node that this action will be performed on.
     * @return Boolean
     */
    editMaxMark(ev, button, activity) {
        // Prevent the default actions.
        ev.preventDefault();
        // Get the element we're working on.
        const instanceMaxmark = activity.querySelector(SELECTOR.INSTANCEMAXMARK);
        if (!instanceMaxmark) {
            return;
        }
        const instance = activity.querySelector(SELECTOR.ACTIVITYINSTANCE),
            anchor = instanceMaxmark, // Grab the anchor so that we can swap it with the edit form.
            oldMaxMark = instanceMaxmark.firstChild.nodeValue,
            data = {
                'id': slot.getId(activity),
                'quizid': this.quizId,
            };
        let maxMarkText = oldMaxMark;

        this.sendRequest(data, null, 'mod_quiz_get_max_mark')
            .then(response => {
                if (M.core.actionmenu && M.core.actionmenu.instance) {
                    M.core.actionmenu.instance.hideMenu(ev);
                }
                // Try to retrieve the existing string from the server.
                if (response.instancemaxmark) {
                    maxMarkText = response.instancemaxmark;
                }

                // Create the editor and submit button.
                const editForm = util.createElement("form", {action: '#'});

                const editInstructions = util.createElement('span', {
                    id: 'id_editinstructions',
                    "class": CSS.EDITINSTRUCTIONS,
                });

                getString('edittitleinstructions', 'moodle').then(string => {
                    editInstructions.innerHTML = string;
                    return true;
                }).catch(() => {
                    // Can't get lang string.
                });

                const editor = util.createElement('input', {
                    type: 'text',
                    name: 'maxmark',
                    "class": CSS.TITLEEDITOR,
                    value: maxMarkText,
                    autocomplete: 'off',
                    ['aria-describedby']: 'id_editinstructions',
                    maxLength: 12,
                    size: parseInt(this.config.questiondecimalpoints, 10) + 2,
                });


                // Clear the existing content and put the editor in.
                editForm.appendChild(editor);
                editForm.dataset.anchor = anchor.outerHTML;
                instance.parentNode.insertBefore(editInstructions, instance);
                // Replace anchor span with the editForm input to edit.
                activity.querySelector(SELECTOR.MAXMARKCONTAINER).replaceChild(editForm, anchor);

                // We hide various components whilst editing:
                activity.classList.add(CSS.EDITINGMAXMARK);

                // Focus and select the editor text.
                editor.focus();
                editor.select();

                // Cancel the edit if we lose focus or the escape key is pressed.
                editor.addEventListener('blur', event =>
                    this.handleMaxMarkEditorBlur(event, activity, false));
                editor.addEventListener('keydown', event =>
                    this.handleMaxMarkEditorType(event, activity, true));
                // Handle form submission.
                editForm.addEventListener('submit', event =>
                    this.handleMaxMarkFormSubmit(event, activity, oldMaxMark));

                // Store the event listeners for later removal
                this.editMaxMarkEvents = true;

                return true;
            }).catch(Notification.exception);
    }

    /**
     * Takes care of what needs to happen when the user clicks on the delete multiple button.
     *
     * @param {Event} ev The event that was fired.
     */
    deleteMultipleAction(ev) {
        const problemSection = this.findSectionsThatWouldBecomeEmpty();

        if (typeof problemSection !== 'undefined') {
            getStrings([
                {key: 'cannotremoveslots', component: 'quiz'},
                {key: 'cannotremoveallsectionslots', component: 'quiz', param: problemSection},
            ]).then(([string1, string2]) => {
                Notification.alert(
                    string1,
                    string2,
                );
                return true;
            }).catch(Notification.exception);
        } else {
            this.deleteMultipleWithConfirmation(ev);
        }
    }

    /**
     * Finds the section that would become empty if we remove the selected slots.
     *
     * @returns {String} The name of the first section found
     */
    findSectionsThatWouldBecomeEmpty() {
        let section;
        const sectionNodes = [...document.querySelectorAll(SELECTOR.SECTIONLI)];

        if (sectionNodes.length > 1) {
            sectionNodes.some((node) => {
                const sectionName = node.querySelector(SELECTOR.INSTANCESECTION).textContent;
                const checked = node.querySelectorAll(`${SELECTOR.SELECTMULTIPLECHECKBOX}:checked`);
                const unchecked = node.querySelectorAll(`${SELECTOR.SELECTMULTIPLECHECKBOX}:not(:checked)`);
                if (checked.length > 0 && unchecked.length === 0) {
                    section = sectionName;
                }

                return section;
            });
        }

        return section;
    }

    /**
     * Deletes the given activities or resources after confirmation.
     *
     * @param {Event} ev The event that was fired.
     */
    async deleteMultipleWithConfirmation(ev) {
        ev.preventDefault();

        let ids = '';
        const slots = [];
        document.querySelectorAll(`${SELECTOR.SELECTMULTIPLECHECKBOX}:checked`).forEach((node) => {
            const slotData = slot.getSlotFromComponent(node);
            ids += ids === '' ? '' : ',';
            ids += slot.getId(slotData);
            slots.push(slotData);
        });
        const element = document.querySelector('div.mod-quiz-edit-content');

        // Do nothing if no slots are selected.
        if (!slots.length) {
            return;
        }

        const [title, question, saveLabel] = await getStrings([
            {key: 'confirm', component: 'moodle'},
            {key: 'areyousureremoveselected', component: 'quiz'},
            {key: 'yes', component: 'moodle'},
        ]);

        Notification.saveCancelPromise(
            title,
            question,
            saveLabel,
        ).then(() => {
            const data = {
                ids: ids,
                quizid: this.quizId,
            };
            // Delete items on server.
            this.sendRequest(data, element, 'mod_quiz_delete_multiple').then(response => {
                // Delete locally if deleted on server.
                if (response.deleted) {
                    // Actually remove the element.
                    document.querySelectorAll(`${SELECTOR.SELECTMULTIPLECHECKBOX}:checked`).forEach((node) => {
                        slot.remove(node.closest('li.activity'));
                    });
                    // Update the page numbers and sections.
                    this.reorganiseEditPage();

                    // Remove the select multiple options.
                    document.body.classList.remove(CSS.SELECTMULTIPLE);
                }
                return true;
            }).catch(Notification.exception);
            return true;
        }).catch(() => {
            // User cancelled.
        });
    }

    /**
     * Event to handle max mark when blur.
     *
     * @param {Event} event the blur event of current node.
     * @param {HTMLElement} activity The activity node that this action will be performed on.
     * @param {Boolean} preventDefault
     */
    handleMaxMarkEditorBlur(event, activity, preventDefault) {
        return this.editMaxMarkCancel(event, activity, preventDefault);
    }

    /**
     * Event to handle max mark when escape.
     *
     * @param {Event} event the key down event of current node.
     * @param {HTMLElement} activity The activity node that this action will be performed on.
     * @param {Boolean} preventDefault
     */
    handleMaxMarkEditorType(event, activity, preventDefault) {
        if (event.key === 'Escape' || event.keyCode === 27) {
            this.editMaxMarkCancel(event, activity, preventDefault);
        }
    }

    /**
     * Event to handle max mark when submit.
     *
     * @param {Event} event the submit event of current node.
     * @param {HTMLElement} activity The activity node that this action will be performed on.
     * @param {String} oldMaxMark the old value of max mark.
     */
    handleMaxMarkFormSubmit(event, activity, oldMaxMark) {
        event.preventDefault(); // Prevent the default form submission behavior
        return this.editMaxMarkSubmit(event, activity, oldMaxMark);
    }

    /**
     * Deletes the given activity or resource after confirmation.
     *
     * @param {Event} ev The event that was fired.
     * @param {HTMLElement} button The button that triggered this action.
     * @param {HTMLElement} activity The activity node that this action will be performed on.
     */
    async deleteWithConfirmation(ev, button, activity) {
        // Prevent the default button action.
        ev.preventDefault();

        // Get the element we're working on.
        const element = activity;
        const qtypeClass = element.getAttribute('class').match(/qtype_(\S*)/)[1];

        // Create confirm string (different if element has or does not have name)
        const qtypeName = await getString('pluginname', 'qtype_' + qtypeClass);
        const allStrings = [
            {key: 'confirm', component: 'moodle'},
            {key: 'confirmremovequestion', component: 'quiz', param: qtypeName},
            {key: 'yes', component: 'moodle'},
        ];
        const [title, question, saveLabel] = await getStrings(allStrings);

        try {
            await Notification.saveCancelPromise(
                title,
                question,
                saveLabel,
            );
            const data = {
                'quizid': this.quizId,
                'id': slot.getId(element) // Adjusting the YUI namespace
            };
            this.sendRequest(data, element, 'mod_quiz_delete_resource').then(response => {
                if (response.deleted) {
                    // Actually remove the element.
                    slot.remove(element);
                    this.reorganiseEditPage();
                    if (M.core.actionmenu && M.core.actionmenu.instance) {
                        M.core.actionmenu.instance.hideMenu(ev);
                    }
                }
                return true;
            }).catch(Notification.exception);
        } catch (e) {
            // User cancelled.
        }
    }

    /**
     * Reorganise the UI after every edit action.
     */
    reorganiseEditPage() {
        slot.reorderSlots();
        slot.reorderPageBreaks();
        page.reorderPages();
        slot.updateOneSlotSections();
        slot.updateAllDependencyIcons();
    }

    /**
     * Joins or separates the given slot with the page of the previous slot. Reorders the pages of
     * the other slots.
     *
     * @protected
     * @param {Event} ev - The event that was fired.
     * @param {HTMLElement} button - The button that triggered this action.
     * @param {HTMLElement} activity - The activity node that this action will be performed on.
     * @param {string} action - The action, addpagebreak or removepagebreak.
     */
    updatePageBreak(ev, button, activity, action) {
        // Prevent the default button action
        ev.preventDefault();

        let nextActivity = activity.nextElementSibling;

        while (nextActivity && !nextActivity.matches(SELECTOR.SLOTLI)) {
            nextActivity = nextActivity.nextElementSibling;
        }

        if (!nextActivity) {
            return;
        }

        const value = action === 'removepagebreak' ? 1 : 2;

        const data = {
            'id': slot.getId(nextActivity),
            'value': value,
            'quizid': this.quizId,
        };

        this.sendRequest(data, nextActivity, 'mod_quiz_update_page_break').then(response => {
            if (response.slots) {
                if (action === 'addpagebreak') {
                    page.add(activity);
                } else {
                    const pageEl = activity.nextElementSibling
                        && activity.nextElementSibling.matches(page.SELECTORS.PAGE) ? activity.nextElementSibling : null;
                    if (pageEl) {
                        page.remove(pageEl, true);
                    }
                }
                this.reorganizeEditPage();
            }
            return true;
        }).catch(Notification.exception);
    }

    /**
     * Updates a slot to either require the question in the previous slot to
     * have been answered, or not.
     *
     * @param {Event} ev The event that was fired.
     * @param {Node} button The button that triggered this action.
     * @param {Node} activity The activity node that this action will be performed on.
     * @param {String} action The action, adddependency or removedependency.
     */
    updateDependency(ev, button, activity, action) {
        // Prevent the default button action.
        ev.preventDefault();

        const data = {
            id: slot.getId(activity),
            value: action === 'adddependency' ? 1 : 0,
            quizid: this.quizId,
        };

        this.sendRequest(data, activity, 'mod_quiz_update_dependency').then(response => {
            if (response.hasOwnProperty('requireprevious')) {
                slot.updateDependencyIcon(activity, response.requireprevious);
            }

            return true;
        }).catch(Notification.exception);
    }


    /**
     * Reorganise the UI after every edit action.
     */
    reorganizeEditPage() {
        slot.reorderSlots();
        slot.reorderPageBreaks();
        page.reorderPages();
        slot.updateOneSlotSections();
        slot.updateAllDependencyIcons();
    }

    /**
     * Handles the cancel event when editing the activity or resources maxmark.
     *
     * @param {Event} ev The event that triggered this.
     * @param {Node} activity The activity whose maxmark we are altering.
     * @param {Boolean} preventDefault If true we should prevent the default action from occuring.
     */
    editMaxMarkCancel(ev, activity, preventDefault) {
        if (preventDefault) {
            ev.preventDefault();
        }

        this.editMaxMarkClear(activity);
    }

    /**
     * Handles clearing the editing UI and returning things to the original state they were in.
     *
     * @param {HTMLElement} activity  The activity whose maxmark we were altering.
     */
    editMaxMarkClear(activity) {
        // Detach all listen events to prevent duplicate triggers
        if (!this.editMaxMarkEvents) {
            return;
        }

        this.editMaxMarkEvents = false;

        const editForm = activity.querySelector(SELECTOR.ACTIVITYFORM),
            instructions = activity.querySelector('#id_editinstructions');
        if (editForm) {
            editForm.parentNode.insertAdjacentHTML('afterbegin', editForm.dataset.anchor);
            editForm.remove();
        }
        if (instructions) {
            instructions.parentNode.removeChild(instructions);
        }

        // Remove the editing class again to revert the display.
        activity.classList.remove(CSS.EDITINGMAXMARK);

        // Refocus the link which was clicked originally so the user can continue using keyboard nav.
        setTimeout(function() {
            activity.querySelector(SELECTOR.EDITMAXMARK).focus();
        }, 100);

        // TODO MDL-50768 This hack is to keep Behat happy until they release a version of
        // MinkSelenium2Driver that fixes
        // https://github.com/Behat/MinkSelenium2Driver/issues/80.
        if (!document.querySelector('input[name=maxmark]')) {
            const input = util.createElement('input', {
                type: 'text',
                name: 'maxmark',
                "class": 'd-none',
            });
            document.querySelector('body').appendChild(input);
        }
    }

    /**
     * Handles the submit event when editing the activity or resources maxmark.
     *
     * @param {Event} ev The event that triggered this.
     * @param {HTMLElement} activity The activity whose max mark we are altering.
     * @param {String} originalMaxMark The original max mark the activity or resource had.
     */
    editMaxMarkSubmit(ev, activity, originalMaxMark) {
        // We don't actually want to submit anything.
        ev.preventDefault();
        const editor = activity.querySelector(SELECTOR.ACTIVITYFORM + ' ' + SELECTOR.ACTIVITYMAXMARK);
        // The value should cointain only number.
        editor.value = parseFloat(editor.value.trim());
        const newMaxMark = /^\d+$/.test(editor.value) ? editor.value : 0;
        // Try to blur input to trigger event editMaxMarkClear.
        editor.blur();
        // Update the instance max mark content
        activity.querySelector(SELECTOR.INSTANCEMAXMARK).textContent = newMaxMark;

        if (newMaxMark !== null && newMaxMark !== "" && newMaxMark !== originalMaxMark) {
            const data = {
                'maxmark': newMaxMark,
                'id': slot.getId(activity), // Adjusting the namespace.
                'quizid': this.quizId,
            };
            this.sendRequest(data, activity, 'mod_quiz_update_max_mark').then(response => {
                if (response.instancemaxmark) {
                    activity.querySelector(SELECTOR.INSTANCEMAXMARK).textContent = response.instancemaxmark;
                }
                return true;
            }).catch(Notification.exception);
        }
    }

    /**
     * Add a loading icon to the specified activity.
     * The icon is added within the action area.
     *
     * @param {HTMLElement} activity The activity to add a loading icon to
     * @return {HTMLElement|null} The newly created icon, or null if the action area was not found.
     */
    addSpinner(activity) {
        const actionArea = activity.querySelector(SELECTOR.ACTIONAREA);
        if (actionArea) {
            return util.addSpinner(actionArea);
        }

        return null;
    }
}

/**
 * Section toolbox class.
 *
 * This class is responsible for managing AJAX interactions with sections
 * when adding, editing, removing section headings.
 */
class SectionToolBox extends ToolBox {
    /**
     * An Array of events added when editing a max mark field.
     * These should all be detached when editing is complete.
     */
    editSectionEvents = false;

    /**
     * Initialize the section toolboxes module.
     * Updates all span. Commands with relevant handlers and other required changes.
     *
     * @param {Number} courseId The ID of the Moodle Course being edited.
     * @param {Number} quizId The ID of the quiz being edited.
     */
    constructor(courseId, quizId) {
        const config = JSON.parse(document.querySelector(SELECTOR.CONFIGTOOLBOX).dataset.config);
        super(config, courseId, quizId);
        this.courseId = courseId;
        this.quizId = quizId;
        this.config = config;

        BODY.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' && event.target.closest(SELECTOR.ACTIVITYACTION)) {
                this.handleDataAction(event);
            }
        });

        BODY.addEventListener('click', (event) => {
            if (event.target.closest(SELECTOR.ACTIVITYACTION)) {
                this.handleDataAction(event);
            }
        });

        BODY.addEventListener('change', (event) => {
            if (event.target.closest(SELECTOR.EDITSHUFFLEQUESTIONSACTION)) {
                this.handleDataAction(event);
            }
        });
    }

    /**
     * Handles the delegation event. When this is fired someone has triggered an action.
     *
     * Note not all actions will result in an AJAX enhancement.
     *
     * @param {Event} ev The event that was triggered.
     * @returns {boolean}
     */
    handleDataAction(ev) {
        // We need to get the anchor element that triggered this event.
        let node = ev.target;
        if (!node.matches('a') && !node.matches('input[data-action]')) {
            node = node.closest(SELECTOR.ACTIVITYACTION);
        }

        // From the anchor we can get both the activity (added during initialization) and the action being
        // performed (added by the UI as a data attribute).
        const action = node ? node.getAttribute('data-action') : null;
        const activity = node ? node.closest(SELECTOR.ACTIVITYLI) : null;

        if ((!node.matches('a') && !node.matches('input[data-action]')) || !action || !activity) {
            // It wasn't a valid action node.
            return false;
        }

        // Switch based upon the action and do the desired thing.
        switch (action) {
            case 'edit_section_title':
                // The user wishes to edit the section headings.
                this.editSectionTitle(ev, node, activity);
                break;
            case 'shuffle_questions':
                // The user wishes to edit the shuffle questions of the section (resource).
                this.editShuffleQuestions(ev, node, activity);
                break;
            case 'deletesection':
                // The user is deleting the activity.
                this.deleteSectionWithConfirmation(ev, node, activity);
                break;
            default:
                // Nothing to do here!
                break;
        }

        return true;
    }

    /**
     * Deletes the given section heading after confirmation.
     *
     * @param {Event} ev The event that was fired.
     * @param {HTMLElement} button The button that triggered this action.
     * @param {HTMLElement} activity The activity node that this action will be performed on.
     * @chainable
     */
    async deleteSectionWithConfirmation(ev, button, activity) {
        ev.preventDefault();
        const [title, question, saveLabel] = await getStrings([
            {key: 'confirm', component: 'moodle'},
            {key: 'confirmremovesectionheading', component: 'quiz', param: activity.dataset.sectionname},
            {key: 'yes', component: 'moodle'},
        ]);
        Notification.saveCancelPromise(
            title,
            question,
            saveLabel
        ).then(() => {
            const data = {
                'id': activity.id.replace('section-', ''),
                'quizid': this.quizId,
            };
            this.sendRequest(data, activity.querySelector(SELECTOR.ACTIONAREA), 'mod_quiz_delete_section').then((response) => {
                if (response.deleted) {
                    window.location.reload(true);
                }
                return true;
            }).catch(Notification.exception);
            return true;
        }).catch(() => {
            // User cancelled.
        });
    }

    /**
     * Edit the edit section title for the section.
     *
     * @param {Event} ev The event that was fired.
     * @param {HTMLElement} button The button that triggered this action.
     * @param {HTMLElement} activity The activity node that this action will be performed on.
     * @return {Boolean}
     */
    editSectionTitle(ev, button, activity) {
        // Get the element we're working on
        const activityId = activity.id.replace('section-', '');
        const instanceSection = activity.querySelector(SELECTOR.INSTANCESECTION);
        let anchor = instanceSection; // Grab the anchor so that we can swap it with the edit form.
        const data = {
            'id': activityId,
            'quizid': this.quizId,
        };

        // Prevent the default actions.
        ev.preventDefault();

        this.sendRequest(data, null, 'mod_quiz_get_section_title').then(response => {
            // Try to retrieve the existing string from the server.
            const oldText = response.instancesection;

            // Create the editor and submit button.
            const editForm = util.createElement('form', {action: '#'});
            const editInstructions = util.createElement('span', {"class": CSS.EDITINSTRUCTIONS,
                id: 'id_editinstructions'});
            getString('edittitleinstructions', 'moodle').then(string => {
                editInstructions.innerHTML = string;
                return true;
            }).catch(() => {
                // Can't get lang string.
            });
            const editor = util.createElement('input', {name: 'section', type: 'text', value: oldText,
                autocomplete: 'off', 'aria-describedby': 'id_editinstructions', maxLength: 255});

            // Clear the existing content and put the editor in.
            editForm.appendChild(editor);
            editForm.dataset.anchor = anchor.outerHTML;
            instanceSection.parentNode.insertBefore(editInstructions, instanceSection);
            activity.querySelector(SELECTOR.SECTIONINSTANCE).replaceChild(editForm, anchor);

            // Focus and select the editor text.
            editor.focus();
            editor.select();
            // Cancel the edit if we lose focus or the escape key is pressed.
            editor.addEventListener('blur', event => this.editSectionTitleCancel(event, activity, false));
            editor.addEventListener('keydown', (event) => {
                if (event.key === 'Escape') {
                    this.editSectionTitleCancel(event, activity, true);
                }
            });
            // Handle form submission.
            editForm.addEventListener('submit', (event) => this.editSectionTitleSubmit(event, activity, oldText));
            this.editSectionEvents = true;
            return true;
        }).catch(Notification.exception);
    }

    /**
     * Handles the submit event when editing section heading.
     *
     * @param {Event} ev The event that triggered this.
     * @param {HTMLElement} activity The activity whose section heading we are editing.
     * @param {String} oldText The original section heading.
     */
    async editSectionTitleSubmit(ev, activity, oldText) {
        // We don't actually want to submit anything.
        ev.preventDefault();
        const newTextInput = activity.querySelector(`${SELECTOR.SECTIONFORM} ${SELECTOR.SECTIONINPUT}`);
        let newText = newTextInput.value.trim();
        this.editSectionTitleClear(activity);

        if (newText === null || newText === oldText) {
            return;
        }

        const instanceSection = activity.querySelector(SELECTOR.INSTANCESECTION);
        let instanceSectionText = newText;
        if (newText.trim() === '') {
            // Add a sr-only default section heading text to ensure we don't end up with an empty section heading.
            instanceSectionText = await getString('sectionnoname', 'quiz');
            instanceSection.classList.add('sr-only');
        } else {
            // Show the section heading when a non-empty value is set.
            instanceSection.classList.remove('sr-only');
        }
        instanceSection.textContent = instanceSectionText;

        const data = {
            'newheading': newText,
            'id': activity.id.replace('section-', ''),
            'quizid': this.quizId,
        };

        try {
            const response = await this.sendRequest(data, activity.querySelector(SELECTOR.INSTANCESECTIONAREA),
                'mod_quiz_update_section_title');
            if (response) {
                // Set the content of the section heading if for some reason the response is different from the new text.
                // e.g. filters were applied, the update failed, etc.
                if (newText !== response.instancesection) {
                    if (response.instancesection.trim() === '') {
                        // Add a sr-only default section heading text.
                        instanceSectionText = await getString('sectionnoname', 'quiz');
                        instanceSection.classList.add('sr-only');
                    } else {
                        instanceSectionText = response.instancesection;
                        // Show the section heading when a non-empty value is set.
                        instanceSection.classList.remove('sr-only');
                    }
                    instanceSection.textContent = instanceSectionText;
                }

                const editSectionIcon = activity.querySelector(SELECTOR.EDITSECTIONICON);
                editSectionIcon.title = await getString('sectionheadingedit', 'quiz', response.instancesection);
                editSectionIcon.alt = await getString('sectionheadingedit', 'quiz', response.instancesection);

                const deleteIcon = activity.querySelector(SELECTOR.DELETESECTIONICON);
                if (deleteIcon) {
                    deleteIcon.title = await getString('sectionheadingremove', 'quiz', response.instancesection);
                    deleteIcon.alt = await getString('sectionheadingremove', 'quiz', response.instancesection);
                }
            }
        } catch (error) {
            // Ignore.
        }
    }

    /**
     * Handles the cancel event when editing the section heading.
     *
     * @param {Event} ev The event that triggered this.
     * @param {HTMLElement} activity The activity whose section heading we are editing.
     * @param {Boolean} preventDefault If true we should prevent the default action from occuring.
     */
    editSectionTitleCancel(ev, activity, preventDefault) {
        if (preventDefault) {
            ev.preventDefault();
        }
        this.editSectionTitleClear(activity);
    }

    /**
     * Handles clearing the editing UI and returning things to the original state.
     *
     * @param {HTMLElement} activity The activity whose section heading we were editing.
     */
    editSectionTitleClear(activity) {
        // Detach all listen events to prevent duplicate triggers
        if (!this.editSectionEvents) {
            return;
        }
        this.editSectionEvents = false;

        const editForm = activity.querySelector(SELECTOR.SECTIONFORM);
        const instructions = activity.querySelector('#id_editinstructions');

        if (editForm) {
            editForm.parentNode.insertAdjacentHTML('afterbegin', editForm.dataset.anchor);
            editForm.remove();
        }
        if (instructions) {
            instructions.remove();
        }

        // Refocus the link which was clicked originally so the user can continue using keyboard nav.
        setTimeout(() => activity.querySelector(SELECTOR.EDITSECTION).focus(), 100);

        // This hack is to keep Behat happy until they release a version of MinkSelenium2Driver that fixes
        // https://github.com/Behat/MinkSelenium2Driver/issues/80.
        if (!document.querySelector('input[name=section]')) {
            const input = util.createElement('input', {
                type: 'text',
                name: 'section',
                "class": 'd-none',
            });
            document.querySelector('body').appendChild(input);
        }
    }

    /**
     * Edit the shuffle questions for the section.
     *
     * @param {Event} ev The event that was fired.
     * @param {HTMLElement} button The button that triggered this action.
     * @param {HTMLElement} activity The activity node that this action will be performed on.
     * @return {Boolean}
     */
    editShuffleQuestions(ev, button, activity) {
        let newValue;
        if (activity.querySelector(SELECTOR.EDITSHUFFLEQUESTIONSACTION).checked) {
            newValue = 1;
            activity.classList.add('shuffled');
        } else {
            newValue = 0;
            activity.classList.remove('shuffled');
        }

        // Prevent default behavior
        ev.preventDefault();

        // Prepare data object
        const data = {
            id: activity.id.replace('section-', ''),
            newshuffle: newValue,
            quizid: this.quizId,
        };

        // Send request (replace with your fetch implementation)
        this.sendRequest(data, activity.querySelector(SELECTOR.EDITSHUFFLEAREA), 'mod_quiz_update_shuffle_questions');
    }
}

/**
 * Init resource toolbox method.
 *
 * @param {Number} courseId The ID of the Moodle Course being edited.
 * @param {Number} quizId The ID of the quiz being edited.
 * @param {Boolean} addEvent The flag to add event. True is add event.
 */
function initResourceToolbox(courseId, quizId, addEvent = true) {
    return new ResourceToolBox(courseId, quizId, addEvent);
}

/**
 * Init section toolbox method.
 *
 * @param {Number} courseId The ID of the Moodle Course being edited.
 * @param {Number} quizId The ID of the quiz being edited.
 */
function initSectionToolbox(courseId, quizId) {
    new SectionToolBox(courseId, quizId);
}
const config = JSON.parse(document.querySelector(SELECTOR.CONFIGTOOLBOX).dataset.config);

export {
    initResourceToolbox,
    initSectionToolbox,
    config,
};