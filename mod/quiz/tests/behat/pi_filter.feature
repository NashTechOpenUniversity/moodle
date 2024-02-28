@mod @mod_quiz
Feature: As a teacher
  In order to filter the user
  I need to be able to filter by their information

  Background:
    Given the following "custom profile fields" exist:
      | datatype | shortname | name |
      | text     | oucu      | oucu |
      | text     | pi        | pi   |
    And the following "users" exist:
      | username | firstname | lastname | email                | idnumber | profile_field_oucu | profile_field_pi |
      | student1 | A         | Student1 | student1@example.com | S1000    | OU101              | PI101            |
      | student2 | B         | Student2 | student2@example.com | S2000    | OU102              | PI102            |
    And the following "courses" exist:
      | fullname | shortname | category |
      | Course 1 | C1        | 0        |
    And the following "course enrolments" exist:
      | user     | course | role    |
      | student1 | C1     | student |
      | student2 | C1     | student |
    And the following "groupings" exist:
      | name | course | idnumber |
      | GP1  | C1     | GP1      |
    And the following "groups" exist:
      | course | idnumber | name    |
      | C1     | G1       | Group 1 |
      | C1     | G2       | Group 2 |
    And the following "grouping groups" exist:
      | grouping | group |
      | GP1      | G1    |
      | GP1      | G2    |
    And the following "group members" exist:
      | group | user     |
      | G1    | student1 |
      | G2    | student2 |
    And the following "question categories" exist:
      | contextlevel | reference | name           |
      | Course       | C1        | Test questions |
    And the following "activities" exist:
      | activity | name   | intro              | course | idnumber | groupmode | grouping |
      | quiz     | Quiz 1 | Quiz 1 description | C1     | quiz1    | 1         | GP1      |
    And the following "questions" exist:
      | questioncategory | qtype     | name | questiontext   |
      | Test questions   | truefalse | TF1  | First question |
    And quiz "Quiz 1" contains the following questions:
      | question | page | maxmark |
      | TF1      | 1    |         |
    And user "student1" has attempted "Quiz 1" with responses:
      | slot | response |
      | 1    | True     |
    And user "student2" has attempted "Quiz 1" with responses:
      | 1 | True |
    And the following config values are set as admin:
      | showuseridentity | email,profile_field_oucu,profile_field_pi |
    And I am on the "Quiz 1" "quiz activity" page logged in as admin
    And I navigate to "Results" in current page administration
    And I should see "Search users"
    And the following should exist in the "attempts" table:
      | First name / Last name |
      | A Student1             |
      | B Student2             |

  @javascript
  Scenario: A teacher can search the user attempt by OUCU.
    When I set the field "Search users" to "OU101"
    And I wait until "B Student2" "option_role" does not exist
    And I click on "A Student1" "list_item"
    And I wait until the page is ready
    Then the following should exist in the "attempts" table:
      | First name / Last name |
      | A Student1             |
    And the following should not exist in the "attempts" table:
      | First name / Last name |
      | B Student2             |

  @javascript
  Scenario: A teacher can search the user attempt by PI.
    When I set the field "Search users" to "PI101"
    And I wait until "B Student2" "option_role" does not exist
    And I click on "A Student1" "list_item"
    And I wait until the page is ready
    Then the following should exist in the "attempts" table:
      | First name / Last name |
      | A Student1             |
    And the following should not exist in the "attempts" table:
      | First name / Last name |
      | B Student2             |

  @javascript
  Scenario: A teacher can filter the user attempt by name.
    When I click on "Filter by name" "combobox"
    # To prevent the help icon from overlapping the apply button.
    And I change viewport size to "1200x1000"
    And ".initialbarall.page-item.active" "css_element" should exist in the ".initialbar.firstinitial" "css_element"
    And ".initialbarall.page-item.active" "css_element" should exist in the ".initialbar.lastinitial" "css_element"
    And I select "Z" in the "Last name" "core_grades > initials bar"
    And I press "Apply"
    And I should see "Nothing to display"
    And I should not see "A Student1"
    And I should not see "B Student2"
    And I click on "Last (Z)" "combobox"
    And I select "B" in the "First name" "core_grades > initials bar"
    And I select "S" in the "Last name" "core_grades > initials bar"
    And I press "Apply"
    Then I should not see "Nothing to display"
    And the following should exist in the "attempts" table:
      | First name / Last name |
      | B Student2             |
    And the following should not exist in the "attempts" table:
      | First name / Last name |
      | A Student1             |

  @javascript
  Scenario: A teacher can filter the user attempt by group.
    When I click on "All participants" in the "group" search widget
    And I wait until "Group 1" "option_role" exists
    And I click on "Group 1" in the "group" search widget
    Then the following should not exist in the "attempts" table:
      | First name / Last name |
      | B Student2             |
    And the following should exist in the "attempts" table:
      | First name / Last name |
      | A Student1             |
