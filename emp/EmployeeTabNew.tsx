import { useState, useEffect, useCallback } from "react";
import type { FormEvent } from "react";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, Search, X } from "lucide-react";
import InfiniteScroll from "react-infinite-scroll-component";
import {
  listEmployeeTypes,
  createEmployeeType,
  updateEmployeeType,
  deleteEmployeeType,
} from "../../../features/employee-type/employeeTypeApi";
import { parseError } from "../../../shared/utils/errorParser";
import type { EmployeeType } from "../../../shared/types/employeeType";
import LoadingSpinner from "../../../shared/ui/LoadingSpinner";
import EditEmployeeTypeModal from "../modals/EditEmployeeTypeModal.tsx";
import DeleteConfirmModal from "../modals/DeleteConfirmModal.tsx";

export default function EmployeeTypeTab() {
  const [items, setItems] = useState<EmployeeType[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const PAGE_SIZE = 20;

  // Modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<EmployeeType | null>(null);

  const loadData = useCallback(async (pageNum = 1, search = "") => {
    if (pageNum === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const data = await listEmployeeTypes(
        pageNum,
        PAGE_SIZE,
        search || undefined,
      );

      if (pageNum === 1) {
        setItems(data.items);
        setPage(1);
      } else {
        setItems((prev) => [...prev, ...data.items]);
      }

      setTotal(data.total);
      setHasMore(pageNum * PAGE_SIZE < data.total);
    } catch (error) {
      toast.error(parseError(error));
    } finally {
      if (pageNum === 1) {
        setLoading(false);
      } else {
        setLoadingMore(false);
      }
    }
  }, []);

  const loadMore = () => {
    if (loading || loadingMore || !hasMore) {
      return;
    }

    const nextPage = page + 1;
    setPage(nextPage);
    loadData(nextPage, search.trim());
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      loadData(1, search.trim());
    }, 350);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [search, loadData]);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }

    setSubmitting(true);
    try {
      await createEmployeeType({ empTypeName: name });
      toast.success("Employee type created successfully");
      setName("");
      await loadData(1, search.trim());
    } catch (error) {
      toast.error(parseError(error));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditClick = (item: EmployeeType) => {
    setSelectedItem(item);
    setShowEditModal(true);
  };

  const handleDeleteClick = (item: EmployeeType) => {
    setSelectedItem(item);
    setShowDeleteModal(true);
  };

  const handleEditSave = async (id: number, newName: string) => {
    try {
      await updateEmployeeType({ empTypeId: id, empTypeName: newName });
      toast.success("Employee type updated successfully");
      setShowEditModal(false);
      setSelectedItem(null);
      await loadData(1, search.trim());
    } catch (error) {
      toast.error(parseError(error));
      throw error;
    }
  };

  const handleDeleteConfirm = async (id: number) => {
    try {
      await deleteEmployeeType(id);
      toast.success("Employee type deleted successfully");
      setShowDeleteModal(false);
      setSelectedItem(null);
      await loadData(1, search.trim());
    } catch (error) {
      toast.error(parseError(error));
      throw error;
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <>
      <div className="row mb-4">
        <div className="col-12">
          <div className="mb-3">
            <h5 className="mb-0">Employee Types</h5>
          </div>

          {/* Create Form */}
          <div className="card mb-4">
            <div className="card-body">
              <h6 className="card-title">Add New Employee Type</h6>
              <form onSubmit={handleCreate}>
                <div className="row g-2">
                  <div className="col-md-8">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Enter employee type name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="col-md-4">
                    <button
                      type="submit"
                      className="btn btn-primary w-100 d-flex align-items-center justify-content-center gap-1"
                      disabled={submitting}
                    >
                      <Plus size={16} />
                      {submitting ? "Creating..." : "Add Employee Type"}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>

          {/* Table */}
          <div className="card">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between mb-3 gap-2 flex-wrap">
                <h6 className="mb-0">Employee Type List</h6>
                <div className="input-group" style={{ maxWidth: "320px" }}>
                  <span className="input-group-text">
                    <Search size={16} />
                  </span>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search employee types"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  {search && (
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => setSearch("")}
                      title="Clear search"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>

              {items.length === 0 && !loading ? (
                <div className="text-center text-muted py-4">
                  {search.trim()
                    ? `No employee types found for "${search.trim()}".`
                    : "No employee types found. Add one above."}
                </div>
              ) : (
                <InfiniteScroll
                  dataLength={items.length}
                  next={loadMore}
                  hasMore={hasMore}
                  scrollThreshold="200px"
                  loader={
                    <div className="text-center py-3">
                      <div
                        className="spinner-border spinner-border-sm text-primary"
                        role="status"
                      >
                        <span className="visually-hidden">Loading...</span>
                      </div>
                      <p className="text-muted mt-2 mb-0">Loading more...</p>
                    </div>
                  }
                  endMessage={
                    items.length > 0 ? (
                      <p className="text-center text-muted py-3">
                        <small>
                          You've reached the end • {total} total item
                          {total !== 1 ? "s" : ""}
                        </small>
                      </p>
                    ) : null
                  }
                >
                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th style={{ width: "150px" }} className="text-end">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item) => (
                          <tr key={item.empTypeId}>
                            <td>{item.empTypeName}</td>
                            <td className="text-end">
                              <button
                                className="btn btn-sm btn-outline-primary me-2"
                                onClick={() => handleEditClick(item)}
                                title="Edit"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => handleDeleteClick(item)}
                                title="Delete"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </InfiniteScroll>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && selectedItem && (
        <EditEmployeeTypeModal
          item={selectedItem}
          onSave={handleEditSave}
          onClose={() => {
            setShowEditModal(false);
            setSelectedItem(null);
          }}
        />
      )}

      {/* Delete Modal */}
      {showDeleteModal && selectedItem && (
        <DeleteConfirmModal
          title="Delete Employee Type"
          message={`Are you sure you want to delete "${selectedItem.empTypeName}"? This action cannot be undone.`}
          onConfirm={() => handleDeleteConfirm(selectedItem.empTypeId)}
          onClose={() => {
            setShowDeleteModal(false);
            setSelectedItem(null);
          }}
        />
      )}
    </>
  );
}
