import { useState, useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import type { CreateReportDTO } from "../../shared/types/report";

/* ── Section metadata ───────────────────────────────────────────────────── */

/** Chart section keys that map to metric keys */
const SECTION_META: {
  key: string;
  label: string;
  group: "summary" | "shared" | "admin" | "manager";
}[] = [
  { key: "summary", label: "Dashboard Summary Cards", group: "summary" },
  { key: "auditChart", label: "Audit Task Status", group: "shared" },
  {
    key: "averageQuizScores",
    label: "Average Quiz Scores",
    group: "shared",
  },
  { key: "policiesWithQuiz", label: "Quiz Coverage", group: "shared" },
  { key: "complianceTrend", label: "Compliance Trend", group: "shared" },
  {
    key: "mostAssignedPolicies",
    label: "Most Assigned Policies",
    group: "admin",
  },
  {
    key: "policiesByCategory",
    label: "Policies by Category",
    group: "admin",
  },
  {
    key: "departmentCompliance",
    label: "Compliance by Department",
    group: "admin",
  },
  { key: "monthlyRollout", label: "Monthly Policy Rollout", group: "admin" },
  {
    key: "checklistBubble",
    label: "Checklist Items per Policy",
    group: "admin",
  },
  {
    key: "teamQuizHistogram",
    label: "Quiz Score Distribution",
    group: "manager",
  },
  {
    key: "teamPendingPolicies",
    label: "Team Pending Policies",
    group: "manager",
  },
  {
    key: "teamTopPerformers",
    label: "Top Team Performers",
    group: "manager",
  },
];

const GROUP_LABELS: Record<string, string> = {
  summary: "Summary",
  shared: "Shared Analytics",
  admin: "Admin Analytics",
  manager: "Team Analytics",
};

const GROUP_ORDER = ["summary", "shared", "admin", "manager"] as const;

/* ── Props ──────────────────────────────────────────────────────────────── */

interface CreateReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateReportDTO) => Promise<void>;
  metrics?: Record<string, unknown>;
  userId: number;
  userRole?: string;
}

/* ── Component ──────────────────────────────────────────────────────────── */

export default function CreateReportModal({
  isOpen,
  onClose,
  onSubmit,
  metrics = {},
  userId,
  userRole = "USER",
}: CreateReportModalProps) {
  const [title, setTitle] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  // Sections that actually have data
  const availableSections = useMemo(
    () => SECTION_META.filter((s) => metrics[s.key] != null),
    [metrics],
  );

  // Additionally filter by role visibility
  const visibleSections = useMemo(() => {
    const allowedGroups = new Set<string>(["summary", "shared"]);
    if (userRole === "ADMIN") allowedGroups.add("admin");
    if (userRole === "MANAGER") allowedGroups.add("manager");
    return availableSections.filter((s) => allowedGroups.has(s.group));
  }, [availableSections, userRole]);

  // Only reset selection when modal transitions from closed → open
  const prevOpenRef = useRef(false);
  useEffect(() => {
    if (isOpen && !prevOpenRef.current) {
      // Modal just opened — initialise selection with all visible sections
      setSelected(new Set(visibleSections.map((s) => s.key)));
      setTitle("");
    }
    prevOpenRef.current = isOpen;

    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen, visibleSections]);

  if (!isOpen) return null;

  const toggle = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleGroup = (group: string) => {
    const groupKeys = visibleSections
      .filter((s) => s.group === group)
      .map((s) => s.key);
    const allSelected = groupKeys.every((k) => selected.has(k));
    setSelected((prev) => {
      const next = new Set(prev);
      groupKeys.forEach((k) => {
        if (allSelected) next.delete(k);
        else next.add(k);
      });
      return next;
    });
  };

  const selectAll = () =>
    setSelected(new Set(visibleSections.map((s) => s.key)));
  const selectNone = () => setSelected(new Set());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selected.size === 0) {
      toast.error("Select at least one chart section");
      return;
    }

    setSaving(true);
    try {
      // Build filtered metrics with only selected keys + metadata
      const filteredMetrics: Record<string, unknown> = {};
      selected.forEach((key) => {
        if (metrics[key] != null) filteredMetrics[key] = metrics[key];
      });
      filteredMetrics.savedAt = new Date().toISOString();
      filteredMetrics.userRole = userRole;
      filteredMetrics.selectedSections = Array.from(selected);

      await onSubmit({
        title: title.trim() || undefined,
        metrics: filteredMetrics,
        createdByUserId: userId,
      } as CreateReportDTO);
      setTitle("");
      onClose();
    } catch {
      // Error handled by parent
    } finally {
      setSaving(false);
    }
  };

  // Group visible sections for rendering
  const groups = GROUP_ORDER.filter((g) =>
    visibleSections.some((s) => s.group === g),
  );

  return (
    <div
      className="modal d-block"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      onClick={(e) => e.target === e.currentTarget && !saving && onClose()}
    >
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Create New Report</h5>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
              disabled={saving}
            />
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              {/* Title */}
              <div className="mb-3">
                <label htmlFor="reportTitle" className="form-label">
                  Report Title
                </label>
                <input
                  type="text"
                  className="form-control"
                  id="reportTitle"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Leave blank for auto-generated title"
                  disabled={saving}
                  autoFocus
                />
              </div>

              {/* Section selection */}
              <div className="mb-2 d-flex justify-content-between align-items-center">
                <label className="form-label mb-0 fw-semibold">
                  Include Sections{" "}
                  <span className="badge bg-primary">
                    {selected.size}/{visibleSections.length}
                  </span>
                </label>
                <div className="btn-group btn-group-sm">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={selectAll}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={selectNone}
                  >
                    None
                  </button>
                </div>
              </div>

              <div
                className="border rounded p-2"
                style={{ maxHeight: 320, overflowY: "auto" }}
              >
                {groups.map((group) => {
                  const items = visibleSections.filter(
                    (s) => s.group === group,
                  );
                  const allChecked = items.every((s) => selected.has(s.key));
                  const someChecked =
                    !allChecked && items.some((s) => selected.has(s.key));
                  return (
                    <div key={group} className="mb-2">
                      <div
                        className="form-check fw-semibold small text-uppercase text-muted px-0 mb-1"
                        style={{ cursor: "pointer" }}
                        onClick={() => toggleGroup(group)}
                      >
                        <input
                          type="checkbox"
                          className="form-check-input me-2"
                          checked={allChecked}
                          ref={(el) => {
                            if (el) el.indeterminate = someChecked;
                          }}
                          onChange={() => toggleGroup(group)}
                        />
                        {GROUP_LABELS[group] ?? group}
                      </div>
                      <div className="ms-4">
                        {items.map((s) => (
                          <div key={s.key} className="form-check">
                            <input
                              type="checkbox"
                              className="form-check-input"
                              id={`sect-${s.key}`}
                              checked={selected.has(s.key)}
                              onChange={() => toggle(s.key)}
                            />
                            <label
                              className="form-check-label"
                              htmlFor={`sect-${s.key}`}
                            >
                              {s.label}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
                {visibleSections.length === 0 && (
                  <p className="text-muted small mb-0 text-center py-3">
                    No analytics data available. Load the Dashboard first.
                  </p>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving || selected.size === 0}
              >
                {saving
                  ? "Saving..."
                  : `Create Report (${selected.size} sections)`}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
