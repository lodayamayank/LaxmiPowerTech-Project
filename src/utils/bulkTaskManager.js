// Bulk Task Management Utility
// Handles creation and submission of multiple tasks at once

import { v4 as uuidv4 } from 'uuid';

/**
 * Create a new task item for bulk submission
 * @param {Object} baseData - Base task data (project, branch, building)
 * @returns {Object} - New task item
 */
export const createTaskItem = (baseData = {}) => {
  return {
    id: uuidv4(),
    ...baseData,
    areaType: 'floor',
    selectedFloor: null,
    selectedFlat: null,
    selectedRoom: null,
    selectedPodium: null,
    selectedCommonArea: null,
    selectedStaircase: null,
    selectedLevel3Activity: null,
    photo: null,
    photoPreview: null,
    notes: '',
    status: 'pending', // pending, uploading, success, error
    error: null,
    createdAt: Date.now()
  };
};

/**
 * Validate a single task item
 * @param {Object} task - Task item to validate
 * @returns {Object} - Validation result
 */
export const validateTaskItem = (task) => {
  const errors = [];

  if (!task.photo) {
    errors.push('Photo is required');
  }

  if (task.areaType === 'floor') {
    if (!task.selectedFloor) errors.push('Floor is required');
    if (!task.selectedFlat) errors.push('Flat is required');
    if (!task.selectedRoom) errors.push('Room is required');
  } else if (task.areaType === 'podium') {
    if (!task.selectedPodium) errors.push('Podium is required');
  } else if (task.areaType === 'common_area') {
    if (!task.selectedCommonArea) errors.push('Common Area is required');
  } else if (task.areaType === 'staircase') {
    if (!task.selectedStaircase) errors.push('Staircase is required');
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Validate all tasks in bulk
 * @param {Array} tasks - Array of task items
 * @returns {Object} - Validation summary
 */
export const validateBulkTasks = (tasks) => {
  const results = tasks.map((task, index) => ({
    index,
    taskId: task.id,
    ...validateTaskItem(task)
  }));

  const invalidTasks = results.filter(r => !r.valid);

  return {
    valid: invalidTasks.length === 0,
    totalTasks: tasks.length,
    validTasks: tasks.length - invalidTasks.length,
    invalidTasks: invalidTasks.length,
    errors: invalidTasks
  };
};

/**
 * Prepare task data for API submission
 * @param {Object} task - Task item
 * @param {Object} baseData - Base data (project, branch, building)
 * @returns {FormData} - Prepared form data
 */
export const prepareTaskFormData = (task, baseData) => {
  const formData = new FormData();
  
  formData.append('project', baseData.projectId);
  formData.append('branch', baseData.branchId);
  formData.append('building', JSON.stringify({ 
    id: baseData.selectedBuilding._id, 
    name: baseData.selectedBuilding.name 
  }));
  
  formData.append('areaType', task.areaType);
  
  if (task.areaType === 'floor') {
    formData.append('wing', JSON.stringify({ id: 'default', name: 'Default' }));
    formData.append('floor', JSON.stringify({ 
      id: task.selectedFloor._id, 
      name: task.selectedFloor.name 
    }));
    formData.append('flat', JSON.stringify({ 
      id: task.selectedFlat._id, 
      name: task.selectedFlat.name 
    }));
    formData.append('room', JSON.stringify({ 
      id: task.selectedRoom._id, 
      name: task.selectedRoom.name 
    }));
  } else if (task.areaType === 'podium') {
    formData.append('podium', JSON.stringify({ 
      id: task.selectedPodium._id, 
      name: task.selectedPodium.name 
    }));
    formData.append('wing', JSON.stringify({ id: 'podium', name: 'Podium Area' }));
    formData.append('floor', JSON.stringify({ id: 'podium', name: task.selectedPodium.name }));
    formData.append('flat', JSON.stringify({ id: 'na', name: 'N/A' }));
    formData.append('room', JSON.stringify({ id: 'na', name: 'N/A' }));
  } else if (task.areaType === 'common_area') {
    formData.append('commonArea', JSON.stringify({ 
      id: task.selectedCommonArea._id, 
      name: task.selectedCommonArea.name 
    }));
    formData.append('wing', JSON.stringify({ id: 'common', name: 'Common Area' }));
    formData.append('floor', JSON.stringify({ id: 'common', name: task.selectedCommonArea.name }));
    formData.append('flat', JSON.stringify({ id: 'na', name: 'N/A' }));
    formData.append('room', JSON.stringify({ id: 'na', name: 'N/A' }));
  } else if (task.areaType === 'staircase') {
    formData.append('staircase', JSON.stringify({ 
      id: task.selectedStaircase._id, 
      name: task.selectedStaircase.name 
    }));
    formData.append('wing', JSON.stringify({ id: 'staircase', name: 'Staircase Area' }));
    formData.append('floor', JSON.stringify({ id: 'staircase', name: task.selectedStaircase.name }));
    formData.append('flat', JSON.stringify({ id: 'na', name: 'N/A' }));
    formData.append('room', JSON.stringify({ id: 'na', name: 'N/A' }));
  }
  
  if (task.selectedLevel3Activity) {
    formData.append('level3Activity', JSON.stringify({ 
      id: task.selectedLevel3Activity, 
      name: task.selectedLevel3Activity 
    }));
  }
  
  formData.append('photo', task.photo);
  formData.append('notes', task.notes || '');
  
  return formData;
};

/**
 * Get task summary for display
 * @param {Object} task - Task item
 * @returns {string} - Task summary
 */
export const getTaskSummary = (task) => {
  let summary = '';
  
  if (task.areaType === 'floor') {
    summary = `${task.selectedFloor?.name || 'Floor'} → ${task.selectedFlat?.name || 'Flat'} → ${task.selectedRoom?.name || 'Room'}`;
  } else if (task.areaType === 'podium') {
    summary = `Podium: ${task.selectedPodium?.name || 'N/A'}`;
  } else if (task.areaType === 'common_area') {
    summary = `Common Area: ${task.selectedCommonArea?.name || 'N/A'}`;
  } else if (task.areaType === 'staircase') {
    summary = `Staircase: ${task.selectedStaircase?.name || 'N/A'}`;
  }
  
  if (task.selectedLevel3Activity) {
    summary += ` | ${task.selectedLevel3Activity}`;
  }
  
  return summary;
};

/**
 * Clone a task item (for quick duplication)
 * @param {Object} task - Task to clone
 * @returns {Object} - Cloned task with new ID
 */
export const cloneTask = (task) => {
  return {
    ...task,
    id: uuidv4(),
    status: 'pending',
    error: null,
    createdAt: Date.now()
  };
};

export default {
  createTaskItem,
  validateTaskItem,
  validateBulkTasks,
  prepareTaskFormData,
  getTaskSummary,
  cloneTask
};
