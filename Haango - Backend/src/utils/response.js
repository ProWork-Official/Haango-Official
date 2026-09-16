export function success(data, meta = null) {
  const response = { success: true, data };
  if (meta) response.meta = meta;
  return response;
}

export function paginated(data, pagination) {
  return {
    success: true,
    data,
    pagination,
  };
}

export function buildPagination(page, limit, total) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit) || 1,
  };
}
