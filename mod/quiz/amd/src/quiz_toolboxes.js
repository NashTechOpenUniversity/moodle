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
 * @module     mod_quiz/quiz_toolboxes
 * @copyright  2024 The Open University.
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {call as fetchMany} from 'core/ajax';
import { slot } from 'mod_quiz/quiz_utils';
import Notification from 'core/notification';
import Pending from 'core/pending';

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
class ResourceToolBox extends ToolBox{
    courseId = 0;
    quizId = 0;
    ajaxURL = null;
    config = {};

    /**
     * An Array of events added when editing a max mark field.
     * These should all be detached when editing is complete.
     *
     * @property editMaxMarkEvents
     * @protected
     * @type Array
     * @protected
     */
    editMaxMarkEvents = [];

    constructor(courseId, quizId, ajaxURL) {
        const config = JSON.parse(document.querySelector(SELECTOR.CONFIGTOOLBOX).dataset.config);
        super(config, courseId, quizId);
        this.courseId = courseId;
        this.quizId = quizId;
        this.ajaxURL = ajaxURL;
        this.config = config;
        // this.config = config;
        // M.mod_quiz.quizbase.register_module(this);
        BODY.addEventListener('click', (event) => {
            // Use event.target.closest to ensure event delegation works
            if (event.target.closest(SELECTOR.ACTIVITYACTION) ||
                    event.target.closest(SELECTOR.DEPENDENCY_LINK)) {
                this.handleDataAction(event);
            }
        });
    }

    /**
     * Handles the delegation event. When this is fired someone has triggered an action.
     *
     * Note not all actions will result in an AJAX enhancement.
     *
     * @protected
     * @method handleDataAction
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
     * @protected
     * @method editMaxMark
     * @param {Event} ev The event that was fired.
     * @param {Element} button The button that triggered this action.
     * @param {Element} activity The activity node that this action will be performed on.
     * @return Boolean
     */
    editMaxMark(ev, button, activity) {
        // Get the element we're working on.
        const instanceMaxmark = activity.querySelector(SELECTOR.INSTANCEMAXMARK),
            instance = activity.querySelector(SELECTOR.ACTIVITYINSTANCE),
            anchor = instanceMaxmark, // Grab the anchor so that we can swap it with the edit form.
            oldMaxMark = instanceMaxmark.firstChild.nodeValue,
            data = {
                'id': slot.getId(activity),
                'quizid': this.quizId,
            };
        let maxMarkText = oldMaxMark;
        let thisEvent;

        // Prevent the default actions.
        ev.preventDefault();
        const pending = new Pending('get-max-mark');
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
                const editForm = this.createElement("form", {action: '#'});

                const editInstructions = this.createElement('span', {
                    id: 'id_editinstructions',
                    class: CSS.EDITINSTRUCTIONS,
                });

                editInstructions.innerHTML = M.util.get_string('edittitleinstructions', 'moodle');

                const editor = this.createElement('input', {
                    type: 'text',
                    name: 'maxmark',
                    class: CSS.TITLEEDITOR,
                    value: maxMarkText,
                    autocomplete: 'off',
                    ['aria-describedby']: 'id_editinstructions',
                    maxLength: 12,
                    size: parseInt(this.config.questiondecimalpoints, 10) + 2,
                })


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
                editor.addEventListener('blur', event => this.handleMaxMarkEditorBlur
                    .call(this, event, activity, false));
                editor.addEventListener('keydown', event => this.handleMaxMarkEditorType
                    .call(this, event, activity, true));
                // Handle form submission.
                editForm.addEventListener('submit', event => this.handleMaxMarkFormSubmit
                    .call(this, event, activity, oldMaxMark));

                // Store the event listeners for later removal
                this.editMaxMarkEvents = [
                    {type: 'blur', handler: this.handleMaxMarkEditorBlur, element:  editor},
                    {type: 'keydown', handler: this.handleMaxMarkEditorType, element: editor},
                    {type: 'submit', handler: this.handleMaxMarkFormSubmit, element: editForm}
                ];
            })
            .catch(Notification.exception);
    }

    handleMaxMarkEditorBlur(event, activity, preventDefault) {
        return this.editMaxMarkCancel(event, activity, preventDefault);
    }

    handleMaxMarkEditorType(event, activity, preventDefault) {
        if (event.key === 'Escape' || event.keyCode === 27) {
            this.editMaxMarkCancel(event, activity, preventDefault);
        }
    }

    handleMaxMarkFormSubmit(event, activity, oldMaxMark) {
        event.preventDefault(); // Prevent the default form submission behavior
        return this.editMaxMarkSubmit(event, activity, oldMaxMark);
    }

    deleteWithConfirmation() {

    }

    updatePageBreak() {

    }

    updateDependency() {

    }

    createElement(tag, attributes) {
        const element = document.createElement(tag);
        for (let key in attributes) {
            element.setAttribute(key, attributes[key]);
        }

        return element;
    }

    /**
     * Handles the cancel event when editing the activity or resources maxmark.
     *
     * @protected
     * @method editMaxMarkCancel
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
     * @protected
     * @method editMaxMarkClear
     * @param {Element} activity  The activity whose maxmark we were altering.
     */
    editMaxMarkClear(activity) {
        console.log(this.editMaxMarkEvents);
        // Detach all listen events to prevent duplicate triggers
        this.editMaxMarkEvents.forEach(event => {
            event.element.removeEventListener(event.type, event.handler);
        });


        const editForm = activity.querySelector(SELECTOR.ACTIVITYFORM),
            instructions = activity.querySelector('#id_editinstructions');
        if (editForm) {
            editForm.parentNode.append(editForm.dataset.anchor);
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
            const input = this.createElement('input', {
                type: 'text',
                name: 'maxmark',
                class: 'd-none',
            })
            document.querySelector('body').appendChild(input);
        }
    }

    editMaxMarkSubmit() {

    }
}

class ToolBox {
    config= {};
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
     * @method sendRequest
     * @param {Object} data The data to submit with the AJAX request
     * @param {Element} [statusSpinner] A statusSpinner which may contain a section loader
     * @param {String} methodName The service name.
     * @param {Object} [optionalConfig] Any additional configuration to submit
     * @chainable
     */
    sendRequest(data, statusSpinner, methodName, optionalConfig) {
        // Default data structure
        // if (!data) {
        //     data = {};
        // }

        // Handle any variables which we must pass back through to
        // const pageParams = this.config.pageparams;
        // for (let varName in pageParams) {
        //     data[varName] = pageParams[varName];
        // }

        // data.sesskey = M.cfg.sesskey;
        // data.courseid = this.courseId;
        // data.quizid = this.quizId;

        const parameters = {
            methodname: methodName,
            args: data,
        };
        // var uri = M.cfg.wwwroot + this.get('ajaxurl');
        //
        // // Define the configuration to send with the request
        // var responsetext = [];
        // var config = {
        //     method: 'POST',
        //     data: data,
        //     on: {
        //         success: function(tid, response) {
        //             try {
        //                 responsetext = Y.JSON.parse(response.responseText);
        //                 if (responsetext.error) {
        //                     new M.core.ajaxException(responsetext);
        //                 }
        //             } catch (e) {
        //                 // Ignore.
        //             }
        //
        //             // Run the callback if we have one.
        //             if (responsetext.hasOwnProperty('newsummarks')) {
        //                 Y.one(SELECTOR.SUMMARKS).setHTML(responsetext.newsummarks);
        //             }
        //             if (responsetext.hasOwnProperty('newnumquestions')) {
        //                 Y.one(SELECTOR.NUMQUESTIONS).setHTML(
        //                     M.util.get_string('numquestionsx', 'quiz', responsetext.newnumquestions)
        //                 );
        //             }
        //             if (successCallback) {
        //                 Y.bind(successCallback, this, responsetext)();
        //             }
        //
        //             if (statusSpinner) {
        //                 window.setTimeout(function() {
        //                     statusSpinner.hide();
        //                 }, 400);
        //             }
        //         },
        //         failure: function(tid, response) {
        //             if (statusSpinner) {
        //                 statusSpinner.hide();
        //             }
        //             new M.core.ajaxException(response);
        //         }
        //     },
        //     context: this
        // };

        // Apply optional config
        if (optionalConfig) {
            for (let varName in optionalConfig) {
                config[varName] = optionalConfig[varName];
            }
        }

        if (statusSpinner) {
            statusSpinner.classList.remove('d-none');
        }

        return fetchMany([parameters])[0];
    }
}

/**
 * In a given group, set all the drags and drops to be the same size.
 *
 * @param {Object} config the config data.
 */
function init_resource_toolbox(courseid, quizid, ajaxurl) {
    console.table(courseid, quizid, ajaxurl);
    const toolBox = new ResourceToolBox(courseid, quizid, ajaxurl);
}

export {
    init_resource_toolbox,
}