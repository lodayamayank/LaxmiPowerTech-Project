/**
 * Branch Context Utility
 * Manages the selected branch context for data isolation in material modules
 */

/**
 * Get the currently selected branch ID from localStorage
 * @returns {string|null} The selected branch ID or null if none selected
 */
export const getSelectedBranchId = () => {
  return localStorage.getItem('selectedBranchId');
};

/**
 * Get the currently selected branch name from localStorage
 * @returns {string|null} The selected branch name or null if none selected
 */
export const getSelectedBranchName = () => {
  return localStorage.getItem('selectedBranchName');
};

/**
 * Set the selected branch context
 * @param {string} branchId - The branch ID to set as selected
 * @param {string} branchName - The branch name to set as selected
 */
export const setSelectedBranch = (branchId, branchName) => {
  if (branchId) {
    localStorage.setItem('selectedBranchId', branchId);
    localStorage.setItem('selectedBranchName', branchName || 'Selected Branch');
  }
};

/**
 * Clear the selected branch context
 */
export const clearSelectedBranch = () => {
  localStorage.removeItem('selectedBranchId');
  localStorage.removeItem('selectedBranchName');
};

/**
 * Check if a branch is currently selected
 * @returns {boolean} True if a branch is selected, false otherwise
 */
export const hasBranchContext = () => {
  return !!getSelectedBranchId();
};

/**
 * Add selectedBranchId query parameter to API calls for supervisor/subcontractor
 * @param {Object} params - Existing query parameters
 * @returns {Object} Updated params with selectedBranchId if applicable
 */
export const addBranchFilter = (params = {}) => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const selectedBranchId = getSelectedBranchId();
  
  // Only add branch filter for supervisor/subcontractor with selected branch
  if ((user.role === 'supervisor' || user.role === 'subcontractor') && selectedBranchId) {
    return {
      ...params,
      selectedBranchId
    };
  }
  
  return params;
};
