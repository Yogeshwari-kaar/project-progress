const express = require("express");
const app = express();
const moment = require("moment");
const fs = require("fs");

const projectProgressCalculation = (taskStruct, projectSettings, dbStatus = []) => {
  console.log("I am coming from local link");
  taskStruct.forEach((task) => {
    task.id = task._id || task.id;
    task.plannedEndDate = task.plannedTo || task.plannedEndDate || "";
    task.plannedStartDate = task.plannedFrom || task.plannedStartDate || "";
  });

  if (projectSettings.length > 0) {
    projectSettings = projectSettings[0];
  }

  return calculateActualProgress(taskStruct, projectSettings, dbStatus);
};

function findImmediateChildTasks(taskStruct, taskId) {
  const childTasks = taskStruct.filter((task) => {
    const parentId = task.parent || task.parentID || task.parentKey || task.parentid;
    return parentId && parentId.toString() === taskId.toString();
  });
  return childTasks;
}

function calculatePlannedProgress(task, percentage, calcType) {
  const plannedStartDate = task.plannedStartDate || task.plannedFrom || "";
  const plannedEndDate = task.plannedEndDate || task.plannedTo || "";

  if (!plannedStartDate || !plannedEndDate) {
    task.plannedProgress = 0;
    return task;
  }

  const start = moment(plannedStartDate);
  const end = moment(plannedEndDate);
  let totalPlannedDays = Math.max(end.diff(start, "days"), 1); // Ensure at least 1 day

  const today = moment();
  const passedPlannedDays = today.isBefore(start)
    ? 0
    : today.isAfter(end)
    ? totalPlannedDays
    : today.diff(start, "days");

  const passedPlannedDaysPercentage = (passedPlannedDays / totalPlannedDays) * 100;

  if (calcType === "taskcount") {
    task.plannedProgress = passedPlannedDaysPercentage;
  } else {
    task.plannedProgress = (percentage * passedPlannedDaysPercentage) / 100;
  }

  return task;
}

function calculateActualProgress(taskStruct, projectSettings, dbStatus = []) {
  const calcType = projectSettings.milestonecalc;
  const activeStatusIDs = dbStatus
    .filter((status) => status.workItem === "Task" && status.category === "Active")
    .map((status) => status._id.toString());
  const completedStatusIds = dbStatus
    .filter(
      (status) => status.workItem === "Task" && ["Completed", "Approved"].includes(status.category)
    )
    .map((status) => status._id.toString());

  taskStruct.reverse().forEach((task) => {
    const percentage = task.percentage || 0;
    task.isLeaf = task.isLeaf !== undefined ? task.isLeaf : task.isleaf;

    const status = task.status?.[0]?.category;
    const statusId = task.status?.toString();

    if (task.isLeaf) {
      if (["Completed", "Approved"].includes(status) || completedStatusIds.includes(statusId)) {
        task.actualProgress =
          calcType === "milestonepercentage" || calcType === "weightage"
            ? (task.activePercentage / 100) * percentage
            : 100;
      } else if (["Active"].includes(status) || activeStatusIDs.includes(statusId)) {
        const activePercentage = parseInt(projectSettings.activePercentage, 10) || 0;
        task.actualProgress =
          calcType === "milestonepercentage" || calcType === "weightage"
            ? (activePercentage / 100) * percentage
            : activePercentage;
      } else {
        task.actualProgress = 0;
      }
    } else {
      const childTasks = findImmediateChildTasks(taskStruct, task.id);
      const totalActualProgress = childTasks.reduce((sum, child) => sum + child.actualProgress, 0);
      task.actualProgress =
        calcType === "milestonepercentage" || calcType === "weightage"
          ? totalActualProgress
          : totalActualProgress / childTasks.length;
    }

    calculatePlannedProgress(task, percentage, calcType);
  });

  return taskStruct.reverse(); // Revert order after processing
}

async function calculatePercentageSplit(taskStruct, milestoneCalc) {
  taskStruct.forEach((task) => {
    task.id = task._id?.toString() || task.id.toString();
  });

  if (milestoneCalc === "milestonepercentage") {
    taskStruct.forEach((task) => {
      const childTasks = findImmediateChildTasks(taskStruct, task.id);
      const customTasks = childTasks.filter((child) => child.percentageUpdate === "manual");
      const autoTasks = childTasks.filter((child) => child.percentageUpdate === "auto");

      const remainingPercentage =
        task.percentage - customTasks.reduce((sum, child) => sum + child.percentage, 0);
      const percentageSplit = remainingPercentage / autoTasks.length;

      autoTasks.forEach((child) => {
        const matchedTask = taskStruct.find((t) => t.id === child.id);
        if (matchedTask) {
          matchedTask.percentage = percentageSplit;
        }
      });
    });
  } else if (milestoneCalc === "weightage") {
    taskStruct.forEach((task) => {
      const childTasks = findImmediateChildTasks(taskStruct, task.id);
      const parentWeightage = task.plannedWeightage || 0;

      childTasks.forEach((child) => {
        const matchedTask = taskStruct.find((t) => t.id === child.id);
        if (matchedTask) {
          matchedTask.percentage =
            parentWeightage === 0
              ? 0
              : (task.percentage * child.plannedWeightage) / parentWeightage;
        }
      });
    });
  }

  return taskStruct;
}

async function formulateIsLeafTask(taskStruct) {
  const parentIds = new Set(
    taskStruct.map((task) => task.parentID || task.parentKey || task.parentid)
  );
  taskStruct.forEach((task) => {
    task.isLeaf = !parentIds.has(task.id);
  });
  return taskStruct;
}

exports.projectProgressCalculation = projectProgressCalculation;
exports.calculateActualProgress = calculateActualProgress;
exports.calculatePlannedProgress = calculatePlannedProgress;
exports.calculatePercentageSplit = calculatePercentageSplit;
exports.formulateIsLeafTask = formulateIsLeafTask;
