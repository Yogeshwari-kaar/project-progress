const express = require("express");
const app = express();

const moment = require("moment");
const fs = require("fs");
const {
  masterChangeHistory,
} = require("../Ktern-new-repo/ktern-backend-main-v2/models/project-management/workitem-history.model");

const projectProgressCalculation = (taskStruct, projectSettings, dbStatus) => {
  taskStruct.map((dt) => {
    dt.id = dt._id ? dt._id : dt.id;
    dt.plannedEndDate = dt.plannedTo;
    dt.plannedStartDate = dt.plannedFrom;

    if (dt.plannedEndDate && dt.plannedStartDate) {
      if (dt.plannedEndDate) {
        if (dt.plannedEndDate === undefined) {
          dt.plannedEndDate = "";
        }
      } else if (dt.plannedStartDate) {
        if (dt.plannedStartDate === undefined) {
          dt.plannedStartDate = "";
        }
      }
    } else if (dt.plannedFrom && dt.plannedTo) {
      if (dt.plannedTo) {
        if (dt.plannedTo === undefined) {
          dt.plannedEndDate = "";
        }
      } else if (dt.plannedFrom) {
        if (dt.plannedFrom === undefined) {
          dt.plannedStartDate = "";
        }
      }
    }
  });

  if (projectSettings.length > 0) {
    var projectSettings = projectSettings[0];
  }

  var calcType = projectSettings.milestonecalc;
  var taskCount = taskStruct.length;

  if (calcType === "taskcount") {
    taskStruct = calculateActualProgress(taskStruct, projectSettings, dbStatus);
  } else if (calcType === "milestonepercentage") {
    // taskStruct = calculatePercentageSplit(taskStruct, calcType);
    taskStruct = calculateActualProgress(taskStruct, projectSettings, dbStatus);
  } else if (calcType === "weightage") {
    // taskStruct = calculatePercentageSplit(taskStruct, calcType);
    taskStruct = calculateActualProgress(taskStruct, projectSettings, dbStatus);
  }
  return taskStruct;
};

function findImmediateChildTasks(taskStruct, taskid) {
  taskid = taskid;
  var childTasks = [];

  taskStruct.forEach((element) => {
    if (element.parent) {
      if (element.parent.toString() === taskid.toString()) {
        childTasks.push(element);
      }
    } else if (element.parentID) {
      if (element.parentID.toString() === taskid.toString()) {
        childTasks.push(element);
      }
    } else if (element.parentKey) {
      if (element.parentKey.toString() === taskid.toString()) {
        childTasks.push(element);
      }
    } else if (element.parentid) {
      if (element.parentid.toString() === taskid.toString()) {
        childTasks.push(element);
      }
    }
  });
  return childTasks;
}

function calculateplannedProgress(task, percentage, calcType) {
  var plannedStartDate;
  var plannedEndDate;

  task.plannedStartDate = task.plannedFrom ? task.plannedFrom : task.plannedStartDate;
  task.plannedEndDate = task.plannedTo ? task.plannedTo : task.plannedEndDate;

  if (task.plannedEndDate === "" || task.plannedStartDate === "") {
    task.plannedProgress = 0;
    return task;
  }
  plannedStartDate = moment(task.plannedStartDate);
  plannedEndDate = moment(task.plannedEndDate);

  var totalPlannedDays = plannedEndDate.diff(plannedStartDate, "days");

  if (totalPlannedDays === 0) {
    totalPlannedDays = 1; // Treat same day as 1 day
  }

  //PASSED PLANNED DAYS
  var today = moment();

  if (today > plannedEndDate) {
    var passedPlannedDays = totalPlannedDays;
  } else if (today < plannedStartDate) {
    var passedPlannedDays = 0;
  } else {
    var passedPlannedDays = today.diff(plannedStartDate, "days");
  }

  passedPlannedDaysPercentage = (passedPlannedDays / totalPlannedDays) * 100;

  if (calcType === "taskcount") {
    task.plannedProgress = passedPlannedDaysPercentage;
  } else if (calcType === "weightage" || calcType === "milestonepercentage") {
    task.plannedProgress = (percentage * passedPlannedDaysPercentage) / 100;
  }

  return task;
}

function calculateActualProgress(taskStruct, projectSettings, dbStatus = []) {
  var calcType = projectSettings.milestonecalc;

  var taskCount = taskStruct.length;
  var result = {};

  // if (taskStruct.isLeaf === undefined) {
  //   taskStruct = formulateIsLeafTask(taskStruct);
  // }

  if (dbStatus.length > 0) {
    var activeStatusIDs = dbStatus
      .filter((dt) => dt.workItem === "Task" && dt.category === "Active")
      .map((dt) => dt._id.toString());
    var completedStatusIds = dbStatus
      .filter(
        (dt) =>
          dt.workItem === "Task" && (dt.category === "Completed" || dt.category === "Approved")
      )
      .map((dt) => dt._id.toString());
  }

  for (i = taskCount - 1; i >= 0; i--) {
    var percentage = taskStruct[i].percentage ? taskStruct[i].percentage : 0;
    if (taskStruct[i].isLeaf === true || taskStruct[i].isleaf === true) {
      if (
        taskStruct[i].status[0]?.category === "Completed" ||
        taskStruct[i].status[0]?.category === "Approved" ||
        completedStatusIds.includes(taskStruct[i].status.toString())
      ) {
        if (calcType === "milestonepercentage" || calcType === "weightage") {
          taskStruct[i].actualProgress =
            (taskStruct[i].activePercentage / 100) * taskStruct[i].percentage;
        } else {
          taskStruct[i].actualProgress = 100;
        }
      } else if (
        taskStruct[i].status[0]?.category === "Active" ||
        activeStatusIDs.includes(taskStruct[i].status.toString())
      ) {
        if (projectSettings.activeTaskProgressMetric) {
          if (calcType === "milestonepercentage" || calcType === "weightage") {
            taskStruct[i].actualProgress =
              (taskStruct[i].activePercentage / 100) * taskStruct[i].percentage;
          } else {
            taskStruct[i].actualProgress = taskStruct[i].activePercentage;
          }
        } else if (projectSettings.activePercentage) {
          activePercentage = parseInt(projectSettings.activePercentage, 10)
            ? parseInt(projectSettings.activePercentage, 10)
            : 0; // int conv
          if (calcType === "milestonepercentage" || calcType === "weightage") {
            taskStruct[i].actualProgress = (activePercentage / 100) * taskStruct[i].percentage;
          } else {
            taskStruct[i].actualProgress = activePercentage;
          }
        } else {
          taskStruct[i].actualProgress = 0;
        }
      } else {
        taskStruct[i].actualProgress = 0;
      }
    } else {
      var childTasks = findImmediateChildTasks(taskStruct, taskStruct[i].id);
      var totalActualProgress = 0;
      for (j = 0; j < childTasks.length; j++) {
        totalActualProgress = totalActualProgress + childTasks[j].actualProgress;
      }

      if (calcType === "milestonepercentage" || calcType === "weightage") {
        taskStruct[i].actualProgress = totalActualProgress;
      } else {
        taskStruct[i].actualProgress = totalActualProgress / childTasks.length;
      }
    }

    taskStruct[i] = calculateplannedProgress(taskStruct[i], percentage, calcType);
  }
  return taskStruct;
}

async function calculatePercentageSplit(taskStruct, milestonecalc) {
  taskCount = taskStruct.length;
  if (milestonecalc === "milestonepercentage") {
    for (i = 0; i < taskCount; i++) {
      var childTasksCount;
      var taskid = taskStruct[i].id;
      var percentage = taskStruct[i].percentage;

      childTasks = findImmediateChildTasks(taskStruct, taskid);
      childTasksCount = childTasks.length;

      if (childTasks.length > 0) {
        var customPercentage = 0;
        var customFlag = false;
        var customPercentageCount = 0;

        childTasks.map((dt) => {
          if (dt.percentageUpdate === "manual") {
            customFlag = true;
            customPercentageCount += 1;
            customPercentage = customPercentage + dt.percentage;
          }
        });

        percentage = percentage - customPercentage;

        var percentageSplit = percentage / (childTasksCount - customPercentageCount);

        for (j = 0; j < childTasksCount; j++) {
          if (childTasks[j].percentageUpdate === "auto") {
            let matchedTask = taskStruct.find(
              (dt) => dt.id.toString() === childTasks[j].id.toString()
            );
            if (matchedTask) {
              matchedTask.percentage = percentageSplit;
            }
          }
        }
      }
    }
    return taskStruct;
  } else if (milestonecalc === "weightage") {
    for (i = 0; i < taskCount; i++) {
      var taskid = taskStruct[i].id;
      var percentage = taskStruct[i].percentage;
      var parentWeightage = taskStruct[i].plannedWeightage;
      childTasks = findImmediateChildTasks(taskStruct, taskid);

      var childTasksCount = childTasks.length;

      if (childTasksCount > 0) {
        for (j = 0; j < childTasksCount; j++) {
          let matchedTask = taskStruct.find(
            (dt) => dt.id.toString() === childTasks[j].id.toString()
          );
          if (matchedTask) {
            if (parentWeightage === 0) {
              matchedTask.percentage = 0;
            } else {
              matchedTask.percentage =
                (percentage * matchedTask.plannedWeightage) / parentWeightage;
            }
          }
        }
      }
    }
    return taskStruct;
  }
}

async function formulateIsLeafTask(taskStruct) {
  var refTaskIDs = [];
  taskStruct.forEach((dt) => {
    dt.id = dt._id.toString();
    if (dt.parentID) {
      refTaskIDs.push(dt.parentID.toString());
    } else if (dt.refTaskID) {
      refTaskIDs.push(dt.refTaskID.toString());
    } else if (dt.parentKey) {
      refTaskIDs.push(dt.parentKey.toString());
    } else if (dt.parentid) {
      refTaskIDs.push(dt.parentid.toString());
    }
  });

  taskStruct.forEach((dt) => {
    if (!refTaskIDs.includes(dt.id)) {
      dt.isLeaf = true;
    } else {
      dt.isLeaf = false;
    }
  });

  return taskStruct;
}
exports.projectProgressCalculation = projectProgressCalculation;
exports.calculateActualProgress = calculateActualProgress;
exports.calculateplannedProgress = calculateplannedProgress;
exports.calculatePercentageSplit = calculatePercentageSplit;
exports.formulateIsLeafTask = formulateIsLeafTask;
