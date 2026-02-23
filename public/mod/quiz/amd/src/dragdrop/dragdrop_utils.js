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
 * JavaScript for util function for drag drop.
 *
 * @module    mod_quiz/dragdrop/dragdrop_utils
 * @copyright 2024 The Open University
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import Modal from 'core/modal';
import {get_string as getString} from 'core/str';
import Prefetch from 'core/prefetch';
import ModalEvents from 'core/modal_events';
import Notification from 'core/notification';

Prefetch.prefetchStrings('quiz', ['dragtoafter', 'movecontent']);
const dragdropUtils = {

    /**
     * Builds a list element containing draggable items with drop targets.
     *
     * @async
     * @param {NodeList} dropTargetElement - A list of all target elements where the item can be dropped.
     * @param {number} currentPosition - The index of the current element being dragged.
     *
     * @returns {HTMLElement} The generated list of draggable items to display in the modal.
     */
    buildListItem: async function(dropTargetElement, currentPosition) {
        const ul = document.createElement('ul');
        ul.setAttribute('class', 'dragdrop-keyboard-drag');
        const utils = this;
        // Create an array of promises to ensure all async tasks finish before continuing
        const promises = [];
        dropTargetElement.forEach((e, index) => {
            if (index !== currentPosition && currentPosition !== index + 1) {
                const promise = (async function() {
                    const listLink = document.createElement('a');
                    const listItem = document.createElement('li');
                    listLink.textContent = await getString('dragtoafter', 'mod_quiz', utils.getNodeText(e));
                    listLink.setAttribute('role', 'button');
                    listLink.setAttribute('tabindex', '0');
                    listLink.setAttribute('data-dropzoneid', e.id);

                    listItem.appendChild(listLink);
                    ul.appendChild(listItem);
                })();
                promises.push(promise);
            } else {
                ul.setAttribute('data-dragitemid', e.id);
            }
        });

        await Promise.all(promises);
        return ul;
    },

    /**
     * Displays a modal dialog that allows the user to select a drop target for the dragged item.
     *
     * @async
     * @param {HTMLElement} listItem - The generated list of draggable items to display in the modal.
     * @param {Event} e - The event object from the drag-and-drop action.
     * @param {Array} dragDropElementList - A list of draggable items.
     * @param {HTMLElement} container - The container element that holds the draggable items.
     */
    handleDragDropModal: async function(listItem, e, dragDropElementList, container) {
        const modal = await Modal.create({
            title: getString('movecontent', 'moodle', this.getNodeText(e.target.closest('li.slot'))),
            body: listItem.outerHTML,
            footer: '',
            show: true,
            removeOnClose: true,
        });
        const utils = this;
        const root = modal.getRoot();
        root.on(ModalEvents.shown, function() {
            // Focus on the first link.
            root[0].querySelector('a').focus();

            // Add keyboard (space and enter) and mouse support when we click on the link to drag drop.
            const listLinks = root[0].querySelectorAll('a');
            listLinks.forEach((link) => {
                link.addEventListener('click', function(event) {
                    utils.handleDragDropEvent(event, container, dragDropElementList);
                    modal.destroy();
                });
                link.addEventListener('keydown', (event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        utils.handleDragDropEvent(event, container, dragDropElementList);
                        modal.destroy();
                    }
                });
            });

        });
    },

    /**
     * Handles the move action for a drag-and-drop operation.
     *
     * This function is triggered by an event (e.g., click or keydown).
     * @param {Event} event - The event object triggered by the user interaction (e.g., click or keydown).
     * @param {HTMLElement} container - The container element that holds the draggable items.
     * @param {Array} dragDropElementList - A list of draggable items.
     */
    handleMoveAction: function(event, container, dragDropElementList) {
        const dropParent = event.target.closest('.dropready');
        const dropTargetElement = document.querySelectorAll('ul.section li');
        const currentPosition = Array.from(dropTargetElement).map(item => item.id).indexOf(dropParent.id);

        // Build the list using the buildList function.
        this.buildListItem(dropTargetElement, currentPosition).then((listItem) => {
            // Show the modal with the generated list as the body content.
            this.handleDragDropModal(listItem, event, dragDropElementList, container);
            return true;
        }).catch(Notification.exception);
    },

    /**
     * Handles the actual drag-and-drop event, moving the dragged item to the selected drop target.
     *
     * @param {Event} event - The event object triggered by a user interaction (click or keydown).
     * @param {HTMLElement} container - The container element that holds the draggable items.
     * @param {Array} dragDropElementList - A list of draggable items.
     */
    handleDragDropEvent: function(event, container, dragDropElementList) {
        const dropZoneNode = container.getElement('#' + event.target.dataset.dropzoneid);
        const dragDropNodeId = event.target.closest('ul').dataset.dragitemid;
        // Move using keyboard is a little different. We do not want it to change the page.
        dragDropElementList.forEach((dragItem) => {
            if (dragItem.id === dragDropNodeId) {
                dropZoneNode.dataset.moveafter = true;
                dragItem.reactive.dispatch('moveQuestion', dragItem.getDraggableData(), dropZoneNode);
                dropZoneNode.dataset.moveafter = '';
                return true;
            }
            return false;
        });
    },

    /**
     * Retrieves the text content of a DOM node, prioritizing accessible attributes such as `aria-label` and `aria-labelledby`.
     *
     * @param {HTMLElement} node - The DOM node to extract text from.
     *
     * @returns {string} The extracted text content or an empty string if no text is found.
     */
    getNodeText: function(node) {
        let text = '';

        // Try to resolve using aria-label first.
        text = node.getAttribute('aria-label') || '';
        if (text.length > 0) {
            return text;
        }

        // Now try to resolve using aria-labelledby.
        const labelledByNodeId = node.getAttribute('aria-labelledby');
        if (labelledByNodeId) {
            const labelNode = document.getElementById(labelledByNodeId);
            if (labelNode && labelNode.textContent.trim().length > 0) {
                return labelNode.textContent.trim();
            }
        }

        // The valid node types to get text from.
        const nodes = node.querySelectorAll('h2, h3, h4, h5, span:not(.actions):not(.menu-action-text),' +
            ' p, div.no-overflow, div.dimmed_text');

        // Iterate over the found nodes to extract text
        nodes.forEach(function(node) {
            if (text === '') {
                const nodeText = node.textContent.trim();
                if (nodeText !== '') {
                    text = nodeText;
                }
            }
        });

        if (text !== '') {
            return text;
        }

        return ''; // Return an empty string if no text is found
    }
};
export {
    dragdropUtils,
};
