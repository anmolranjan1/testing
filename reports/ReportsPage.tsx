import { useState, useEffect, useCallback } from "react";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import { Eye, Edit, Trash2, Search } from "lucide-react";
import { Navigate, useNavigate } from "react-router-dom";
import InfiniteScroll from "react-infinite-scroll-component";
import type { RootState } from "../../app/store/store";
import {
  listReports,
  deleteReport,
  getReportById,
  updateReportTitle,
} from "./reportApi";
import type { ReportListItem, Report } from "../../shared/types/report";
import { parseError } from "../../shared/utils/errorParser";
import LoadingSpinner from "../../shared/ui/LoadingSpinner";
import { ROUTES } from "../../shared/constants/routes";
import EditReportModal from "./EditReportModal";

export default function ReportsPage() {
  const user = useSelector((state: RootState) => state.auth.user);
  const navigate = useNavigate();
  const [reports, setReports] = useState<ReportListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [reportToDelete, setReportToDelete] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const PAGE_SIZE = 20;

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounced(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const loadReports = useCallback(
    async (pageNum = 1) => {
      if (!user?.id) return;
      if (pageNum === 1) setLoading(true);

      try {
        const response = await listReports(
          user.id,
          pageNum,
          PAGE_SIZE,
          searchDebounced || undefined,
        );
        if (pageNum === 1) {
          setReports(response.items);
          setPage(1);
        } else {
          setReports((prev) => [...prev, ...response.items]);
        }
        setTotal(response.total);
        setHasMore(pageNum * PAGE_SIZE < response.total);
      } catch (error) {
        toast.error(parseError(error));
      } finally {
        setLoading(false);
      }
    },
    [user?.id, searchDebounced],
  );

  // Reload when search changes
  useEffect(() => {
    loadReports(1);
  }, [loadReports]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    loadReports(nextPage);
  };

  const handleViewReport = (id: number) => {
    navigate(ROUTES.MANAGE_REPORT_VIEW.replace(":id", String(id)));
  };

  const handleEditReport = async (id: number) => {
    try {
      const report = await getReportById(id);
      setSelectedReport(report);
      setShowEditModal(true);
    } catch (error) {
      toast.error(parseError(error));
    }
  };

  const handleUpdateTitle = async (id: number, title: string) => {
    try {
      await updateReportTitle(id, { title });
      toast.success("Report title updated successfully");
      loadReports();
    } catch (error) {
      toast.error(parseError(error));
      throw error;
    }
  };

  const handleDelete = (id: number) => {
    setReportToDelete(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!reportToDelete) return;

    setDeleting(true);
    try {
      await deleteReport(reportToDelete);
      toast.success("Report deleted successfully");
      setShowDeleteModal(false);
      setReportToDelete(null);
      loadReports();
    } catch (error) {
      toast.error(parseError(error));
    } finally {
      setDeleting(false);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setReportToDelete(null);
  };

  // Role-based access: Only ADMIN and MANAGER can access
  if (!user || (user.role !== "ADMIN" && user.role !== "MANAGER")) {
    return <Navigate to={ROUTES.DASHBOARD} replace />;
  }

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-0">Reports</h2>
          <p className="text-muted mb-0">
            View and manage saved analytics reports
          </p>
        </div>
        <div
          className="d-flex align-items-center gap-2"
          style={{ maxWidth: 300 }}
        >
          <div className="input-group input-group-sm">
            <span className="input-group-text bg-transparent border-end-0">
              <Search size={14} className="text-muted" />
            </span>
            <input
              type="text"
              className="form-control border-start-0"
              placeholder="Search reports..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {reports.length === 0 && !loading ? (
        <div className="alert alert-info">
          <h6 className="alert-heading">No Reports Found</h6>
          <p className="mb-0">
            Reports are created by saving analytics data from the Dashboard. Go
            to the <strong>Dashboard</strong> and click{" "}
            <strong>"Save as Report"</strong> to create your first report.
          </p>
        </div>
      ) : (
        <InfiniteScroll
          dataLength={reports.length}
          next={loadMore}
          hasMore={hasMore}
          loader={
            <div className="text-center py-3">
              <div
                className="spinner-border spinner-border-sm text-primary"
                role="status"
              >
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="text-muted mt-2 mb-0">Loading more reports...</p>
            </div>
          }
          endMessage={
            reports.length > 0 ? (
              <p className="text-center text-muted py-3">
                <small>
                  You've reached the end • {total} total report
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
                  <th>Title</th>
                  <th>Created By</th>
                  <th>Created At</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => (
                  <tr key={report.id}>
                    <td>{report.title || "Untitled Report"}</td>
                    <td>
                      {report.createdBy?.name || "Unknown"}
                      <span className="badge bg-secondary ms-2">
                        {report.createdBy?.role || "N/A"}
                      </span>
                    </td>
                    <td>
                      {report.createdAt
                        ? new Date(report.createdAt).toLocaleString()
                        : "N/A"}
                    </td>
                    <td className="text-end">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary me-1"
                        onClick={() => handleViewReport(report.id)}
                        title="View Details"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary me-1"
                        onClick={() => handleEditReport(report.id)}
                        title="Edit Title"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handleDelete(report.id)}
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

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div
          className="modal d-block"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          onClick={() => !deleting && cancelDelete()}
        >
          <div
            className="modal-dialog modal-dialog-centered"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirm Delete</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={cancelDelete}
                  disabled={deleting}
                />
              </div>
              <div className="modal-body">
                <p className="mb-0">
                  Are you sure you want to delete this report? This action
                  cannot be undone.
                </p>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={cancelDelete}
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={confirmDelete}
                  disabled={deleting}
                >
                  {deleting ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm me-2"
                        role="status"
                        aria-hidden="true"
                      />
                      Deleting...
                    </>
                  ) : (
                    "Delete Report"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <EditReportModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSubmit={handleUpdateTitle}
        report={selectedReport}
      />
    </div>
  );
}
