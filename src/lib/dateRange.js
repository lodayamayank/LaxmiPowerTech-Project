const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getCurrentMonthDateRange = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  return {
    startDate: formatDate(new Date(year, month, 1)),
    endDate: formatDate(new Date(year, month + 1, 0)),
  };
};

export const isValidDateRange = ({ startDate, endDate }) => {
  const isValidDate = (value) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  };

  return isValidDate(startDate) && isValidDate(endDate) && startDate <= endDate;
};