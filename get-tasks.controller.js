const moment = require('moment');

const projectProgressCalculation =  (req, res) => {

  var taskStruct = req.body.updatedWorkbook;
  var maxLevel = req.body.maxLevel;
  var projectSettings = req.body.projectSettings[0];
  
    var calcType = projectSettings.milestonecalc;
    var taskCount = taskStruct.length;
    maxLevel = 0;

    taskStruct.forEach((dt) =>{
      if (dt.wbs.split(".").length > maxLevel){
        maxLevel = dt.wbs.split(".").length;
      }
    })

    if (calcType === "taskcount"){  
      taskStruct = calculateActualProgress(taskStruct, maxLevel, projectSettings);    
    }
  
    else if (calcType === "milestonepercentage"){
      for (i = 0; i < taskCount; i++){
        var taskid = taskStruct[i].id;
        var percentage = taskStruct[i].percentage;

        childTasks = findImmediateChildTasks(taskStruct, taskid);
        var childTasksCount = childTasks.length;  

        if (childTasks.length > 0){
          var customPercentage = 0;
          var customFlag = false;
          var customPercentageCount = 0;

          childTasks.map((dt) => {
            if(dt.percentageUpdate === true){
              customFlag = true;
              customPercentageCount += 1;
              customPercentage = customPercentage + dt.percentage;
            }
          });

        percentage = percentage - customPercentage;

        var percentageSplit = percentage / (childTasksCount - customPercentageCount);

        for ( j = 0; j < childTasksCount; j++ ){
          if(!childTasks[j].percentageUpdate) {
            let matchedTask = taskStruct.find((dt) => dt.id === childTasks[j].id);
            if (matchedTask) {
              matchedTask.percentage = percentageSplit;
            }
          }
        }
      }
    }
    taskStruct = calculateActualProgress(taskStruct, maxLevel, projectSettings);
    }

    else if(calcType === "weightage"){

      for (i = 0; i < taskCount; i++){
        var taskid = taskStruct[i].id;
        var percentage = taskStruct[i].percentage;
        var parentWeightage = taskStruct[i].plannedWeightage;

        childTasks = findImmediateChildTasks(taskStruct, taskid);

        var childTasksCount = childTasks.length;

        if (childTasksCount > 0){
          for ( j = 0; j < childTasksCount; j++ ){
            if (!childTasks[j].percentageUpdate === true) {
              let matchedTask = taskStruct.find((dt) => dt.id.toString() === childTasks[j].id.toString());
              if (matchedTask) {
                if (parentWeightage === 0){
                  matchedTask.percentage = 0;
                }
                else{
                  matchedTask.percentage = (percentage * matchedTask.plannedWeightage) / parentWeightage;
                }
              }
            }
          }
        }
      }
      taskStruct = calculateActualProgress(taskStruct, maxLevel, projectSettings);
    }
    res.json({ taskStruct });
}
  
function findImmediateChildTasks (taskStruct, taskid){
  taskid = taskid
  var childTasks = [];

  taskStruct.forEach(element => {
    if (element.parent === taskid ) {
      childTasks.push(element);
    }
  });
  return childTasks;
}

function calculateplannedProgress(task, percentage, calcType){

  if (task.plannedEndDate === "" || task.plannedStartDate === ""){
    task.plannedProgress = 0;
    return task;
  }
  const plannedStartDate = moment(task.plannedStartDate);
  const plannedEndDate = moment(task.plannedEndDate);

  const totalPlannedDays = plannedEndDate.diff(plannedStartDate, 'days');
  
  //PASSED PLANNED DAYS
  var today =  moment();

  if (today > plannedEndDate){
    var passedPlannedDays = totalPlannedDays;
  }
  else if (today < plannedStartDate){
    var passedPlannedDays = 0;
  }
  else{
    var passedPlannedDays = today.diff(plannedStartDate, 'days');
  }

  passedPlannedDaysPercentage = (passedPlannedDays / totalPlannedDays) * 100;

  if (calcType === "taskcount"){
    task.plannedProgress = passedPlannedDaysPercentage;
  }
  else if (calcType === "weightage" || calcType === "milestonepercentage"){
    task.plannedProgress = (percentage * passedPlannedDaysPercentage) / 100;
  }
  return task;
}

function calculateActualProgress(taskStruct, maxLevel, projectSettings){

  var calcType = projectSettings.milestonecalc;
  var taskCount = taskStruct.length;

  for ( i = taskCount -1 ; i >= 0; i-- ){

    var percentage = taskStruct[i].percentage;

    if (taskStruct[i].wbs.split(".").length == maxLevel || taskStruct[i].isLeaf === true){
      if(taskStruct[i].status[0].category === "Completed" || taskStruct[i].status[0].category === "Approved"){
        if(calcType === "milestonepercentage" || calcType === "weightage"){
          taskStruct[i].actualProgress = (taskStruct[i].activePercentage / 100) * taskStruct[i].percentage;
        }  
        else{
          taskStruct[i].actualProgress = 100;
        } 
      }
      else if(taskStruct[i].status[0].category === "Active"){
        if(projectSettings.activeTaskProgressMetric){
          if(calcType === "milestonepercentage" || calcType === "weightage"){
            taskStruct[i].actualProgress = (taskStruct[i].activePercentage / 100) * taskStruct[i].percentage;
          }  
          else{
            taskStruct[i].actualProgress = taskStruct[i].activePercentage;
          }
        }
        else{
          taskStruct[i].actualProgress = parseInt(projectSettings.activePercentage, 10) ? parseInt(projectSettings.activePercentage, 10) : 0; // int conv
        }
      }
      else{
        taskStruct[i].actualProgress = 0;
      }
    }
    else{
      var childTasks = findImmediateChildTasks(taskStruct, taskStruct[i].id);
      var totalActualProgress = 0;

      for ( j = 0; j < childTasks.length; j++){
        totalActualProgress = totalActualProgress + childTasks[j].actualProgress;
      }
      taskStruct[i].actualProgress = totalActualProgress / (childTasks.length);
    }
    
    taskStruct[i] = calculateplannedProgress(taskStruct[i], percentage, calcType);
  }
  return taskStruct;
}

exports.projectProgressCalculation = projectProgressCalculation;