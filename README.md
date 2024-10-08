# project-progress

Project Progress Calculation Module

This Node.js module provides functions to calculate project progress based on a given task structure and project settings. It supports different calculation types like task count, milestone percentage, and weightage.

Features
Task Progress Calculation: Calculate both planned and actual progress for tasks based on various criteria.

Support for Different Calculation Types: Handles progress calculation using task count, milestone percentage, and weightage.

Flexible Task Structure: Can work with tasks that have parent-child relationships.


Installation
To install the module, use npm:
npm install ktern-project-progress-calculation

Usage

Importing the Module

const {
projectProgressCalculation
} = require('project-progress-calculation');

projectProgressCalculation(taskStruct, projectSettings)

This is the main function that calculates the progress of all tasks in a project.

Parameters:
taskStruct: An array of task objects, each representing a task with properties like id, plannedStartDate, plannedEndDate, percentage, etc.
projectSettings: An array of project settings objects, determining how progress should be calculated.

Returns:
taskStruct: The updated task structure with calculated progress.
