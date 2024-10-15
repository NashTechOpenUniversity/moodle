@javascript @theme_classic
Feature: Course administration menu
  To navigate in classic theme teachers need to use the course administration menu

  Background:
    Given the following "courses" exist:
      | fullname | shortname |
      | Course 1 | C1        |
    And the following "users" exist:
      | username | firstname | lastname | email |
      | teacher1 | Teacher | 1 | teacher1@example.com |
      | student1 | Student | 1 | student1@example.com |
    And the following "course enrolments" exist:
      | user | course | role |
      | teacher1 | C1 | editingteacher |
      | student1 | C1 | student |

  Scenario: Teacher can use the course administration menu
    And I log in as "teacher1"
    And I am on "Course 1" course homepage
    And I should see the page administration menu

  Scenario: Student cannot see the course administration menu
    And I log in as "student1"
    And I am on "Course 1" course homepage
    And I should not see the page administration menu
    And I log out

  @javascript
  Scenario: Teacher navigate to another page like question export page the selected category should remember.
    Given the following "question categories" exist:
      | contextlevel | reference | name         |
      | Course       | C1        | Categories 1 |
      | Course       | C1        | Categories 2 |
    And the following "questions" exist:
      | questioncategory | qtype     | name | questiontext    |
      | Categories 1     | truefalse | TF1  | First question  |
      | Categories 2     | truefalse | TF2  | Second question |
    And the following "activities" exist:
      | activity | name           | intro                 | course | idnumber |
      | quiz     | Test quiz name | Test quiz description | C1     | quiz1    |
    And quiz "Test quiz name" contains the following questions:
      | question | page |
      | TF2      | 1    |
    When I am on the "quiz1" "Activity" page logged in as "teacher1"
    # Save the cat param to the url.
    And I navigate to "Questions" in current page administration
    And I click on "Second question" "link"
    And I should see "Categories 2 (1)"
    And I press "id_submitbutton"
    # Verify that the category is remembered in Quiz administration > Question bank.
    And I navigate to "Question bank" in current page administration
    Then I should see "TF2"
    And I should not see "TF1"
    # Verify that the category is remembered when go to export page.
    And I click on "Export" "link" in the "#settingsnav li[aria-expanded=true]" "css_element"
    And I navigate to "Question bank" in current page administration
    And I should see "TF2"
    And I should not see "TF1"

  @javascript
  Scenario: Teacher should see the questions which are relevant to that category.
    Given the following "activities" exist:
      | activity | name           | intro                 | course | idnumber |
      | quiz     | Test quiz name | Test quiz description | C1     | quiz1    |
    And the following "question categories" exist:
      | contextlevel    | reference | name         |
      | Course          | C1        | Categories 1 |
      | Activity module | quiz1     | Categories 2 |
    And the following "questions" exist:
      | questioncategory | qtype     | name | questiontext    |
      | Categories 1     | truefalse | TF1  | First question  |
      | Categories 2     | truefalse | TF2  | Second question  |
    And quiz "Test quiz name" contains the following questions:
      | question | page |
      | TF1      | 1    |
      | TF2      | 1    |
    When I am on the "quiz1" "Activity" page logged in as "teacher1"
    And I navigate to "Questions" in current page administration
    Then I should see "TF1"
    And I should see "TF2"
    # Save the cat param to the url.
    And I click on "Second question" "link"
    And I should see "Categories 2 (1)"
    And I press "id_submitbutton"
    And I navigate to "Question bank" in current page administration
    And I should not see "TF1"
    And I should see "TF2"
    And I click on "Course administration" "text"
    And I click on "Question bank" "link" in the "#settingsnav li.type_course[aria-expanded=true]" "css_element"
    And I should see "TF1"
    And I should not see "TF2"
