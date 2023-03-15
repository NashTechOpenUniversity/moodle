@editor @editor_atto @atto @atto_emojipicker
Feature: Atto emojipicker button
  To insert emoji in Atto, I need to use the emojipicker button.

  @javascript
  Scenario: Insert emoji from emojipicker dialogue
    Given I log in as "admin"
    And I open my profile in edit mode
    And I set the field "Description" to "Badger"
    And I select the text in the "Description" Atto editor
    And I click on "Emoji picker" "button"
    And I click on ":grinning:" "button"
    When I press "Update profile"
    Then the "aria-label" attribute of "span[data-type=\"emoji-element\"]" "css_element" should contain "grinning face"
    And the "role" attribute of "span[data-type=\"emoji-element\"]" "css_element" should contain "img"

    And I follow "Preferences" in the user menu
    And I follow "Editor preferences"
    And I set the field "Text editor" to "Plain text area"
    And I press "Save changes"
    And I click on "Edit profile" "link" in the "region-main" "region"
    Then I should see "role=\"img\" aria-label=\"grinning face\""
