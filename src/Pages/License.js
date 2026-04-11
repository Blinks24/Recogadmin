// License.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Tabs,
  Tab,
  Grid,
  TextField,
  Button,
  Autocomplete,
  Chip,
  Stack,
  Typography,
  Divider,
  CircularProgress,
  Snackbar,
  Alert,
  IconButton,
  Tooltip,
  FormControlLabel,
  Switch,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import DownloadIcon from "@mui/icons-material/Download";
import PowerSettingsNewIcon from "@mui/icons-material/PowerSettingsNew";
import CancelIcon from "@mui/icons-material/Cancel";
import { DataGrid } from "@mui/x-data-grid";

/* =========================
   Config
   ========================= */
const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000/api/v1";

const STATUS_OPTIONS = [
  { label: "All", value: "ALL" },
  { label: "Active", value: "Active" },
  { label: "Expired", value: "Expired" },
  { label: "Pending Activation", value: "Pending Activation" },
  { label: "Inactive", value: "Inactive" },
];

const BOOL_FILTER = [
  { label: "All", value: "ALL" },
  { label: "Yes", value: "1" },
  { label: "No", value: "0" },
];

// Generate tab options
const DEDUCTION_OPTIONS = [
  { label: "Flat (F)", value: "F" },
  { label: "Percentage (P)", value: "P" },
];

// Tab-0 filter options
const DEDUCTION_FILTER = [
  { label: "All", value: "ALL" },
  { label: "Flat (F)", value: "F" },
  { label: "Percentage (P)", value: "P" },
];

/* =========================
   Layout Helpers
   ========================= */
function PageContainer({ children }) {
  return (
    <Box
      sx={{
        minHeight: "100%",
        background: (t) => t.palette.background.default,
        p: { xs: 1.5, md: 3 },
      }}
    >
      <Box sx={{ maxWidth: 1200, mx: "auto" }}>{children}</Box>
    </Box>
  );
}

function ShellCard({ title, action, children }) {
  return (
    <Card
      elevation={1}
      sx={{
        borderRadius: 2,
        background: "#fff",
        border: (t) => `1px solid ${t.palette.divider}`,
      }}
    >
      {title && (
        <CardHeader
          title={
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {title}
            </Typography>
          }
          action={action}
        />
      )}
      <CardContent sx={{ pt: 1.5, pb: 2 }}>{children}</CardContent>
    </Card>
  );
}

/* =========================
   Component
   ========================= */
const License = () => {
  // Tabs
  const [tab, setTab] = useState(0);

  // Loading + Toast
  const [loading, setLoading] = useState(false);
  const [snack, setSnack] = useState({ open: false, type: "success", msg: "" });

  // Data
  const [companies, setCompanies] = useState([]);
  const [licenses, setLicenses] = useState([]);

  // Generate form
  const [companyInput, setCompanyInput] = useState(null);
  const [qty, setQty] = useState(1);
  const [validMonth, setValidMonth] = useState(12);

  // flags for generate
  const [livenessFlag, setLivenessFlag] = useState(false);
  const [inOutFlag, setInOutFlag] = useState(false);

  // ✅ NEW: nonpluckerinflag (only allowed when inOutFlag=true)
  const [nonPluckerInFlag, setNonPluckerInFlag] = useState(false);

  // generate deduction type (default F)
  const [deductionType, setDeductionType] = useState(DEDUCTION_OPTIONS[0]);

  // View filters
  const [statusFilter, setStatusFilter] = useState(STATUS_OPTIONS[0]);
  const [companyFilter, setCompanyFilter] = useState(null);
  const [searchText, setSearchText] = useState("");

  // flag filters (All / Yes / No)
  const [livenessFilter, setLivenessFilter] = useState(BOOL_FILTER[0]);
  const [inOutFilter, setInOutFilter] = useState(BOOL_FILTER[0]);

  // deductiontype filter (All / F / P)
  const [deductionFilter, setDeductionFilter] = useState(DEDUCTION_FILTER[0]);

  // Create/Edit Company form
  const [companyEditPick, setCompanyEditPick] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [companyForm, setCompanyForm] = useState({
    companyname: "",
    companycode: "",
    gst: "",
    address1: "",
    address2: "",
    address3: "",
    // ✅ NEW
    maxothours: "",
  });

  // Activate/Cancel confirm dialog
  const [confirm, setConfirm] = useState({
    open: false,
    mode: null, // "activate" | "cancel"
    row: null,
  });

  // ✅ If inOutFlag is turned off, force nonPluckerInFlag off
  useEffect(() => {
    if (!inOutFlag && nonPluckerInFlag) setNonPluckerInFlag(false);
  }, [inOutFlag, nonPluckerInFlag]);

  // Fetch dropdowns + license overview
  const fetchDropdowns = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/lisencegen/drpdowns`);
      const data = await res.json();
      if (!res.ok || data.type !== "success") throw new Error(data.message || "Fetch failed");
      setCompanies(Array.isArray(data.companydata) ? data.companydata : []);
      setLicenses(Array.isArray(data.licensedata) ? data.licensedata : []);
    } catch (e) {
      setSnack({ open: true, type: "error", msg: e.message || "Failed to load" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDropdowns();
  }, [fetchDropdowns]);

  // Generate licenses
  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!companyInput) {
      return setSnack({ open: true, type: "warning", msg: "Choose a company" });
    }
    if (!qty || qty <= 0) {
      return setSnack({ open: true, type: "warning", msg: "Enter a valid quantity" });
    }
    if (!validMonth || validMonth <= 0) {
      return setSnack({ open: true, type: "warning", msg: "Enter valid months" });
    }

    try {
      setLoading(true);
      const payload = {
        companyid: companyInput.companyid,
        qty: Number(qty),
        validmonth: Number(validMonth),

        // flags
        livenessflag: !!livenessFlag,
        inoutflag: !!inOutFlag,

        // ✅ NEW: only send true if inOutFlag is true
        nonpluckerinflag: inOutFlag ? !!nonPluckerInFlag : false,

        // deduction type
        deductiontype: deductionType?.value || "F",
      };

      const res = await fetch(`${API_BASE}/lisencegen/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || data.type !== "success") throw new Error(data.message || "Generation failed");

      setSnack({ open: true, type: "success", msg: data.message || "Licenses generated" });

      // reset
      setQty(1);
      setValidMonth(12);
      setCompanyInput(null);
      setLivenessFlag(false);
      setInOutFlag(false);
      setNonPluckerInFlag(false);
      setDeductionType(DEDUCTION_OPTIONS[0]);

      await fetchDropdowns();
      setTab(0);
    } catch (e) {
      setSnack({ open: true, type: "error", msg: e.message || "Failed to generate" });
    } finally {
      setLoading(false);
    }
  };

  const boolChip = (val, yesLabel, noLabel, emptyLabel = "—", yesColor = "success") => {
    if (val === null || val === undefined) {
      return <Chip label={emptyLabel} size="small" variant="outlined" />;
    }
    return val ? (
      <Chip label={yesLabel} size="small" color={yesColor} />
    ) : (
      <Chip label={noLabel} size="small" variant="outlined" />
    );
  };

  const openConfirm = (mode, row) => setConfirm({ open: true, mode, row });
  const closeConfirm = () => setConfirm({ open: false, mode: null, row: null });

  // IMPORTANT: Activate expects only { licenseid, companycode } (deviceid is generated in backend)
  const doActivate = async (row) => {
    try {
      setLoading(true);
      const payload = {
        licenseid: row?.licenseid,
        companycode: row?.companycode,
      };
      const res = await fetch(`${API_BASE}/lisencegen/activate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || data.type !== "success") {
        throw new Error(data.message || data.details || "Activate failed");
      }

      setSnack({ open: true, type: "success", msg: data.message || "Activated" });
      await fetchDropdowns();
    } catch (e) {
      setSnack({ open: true, type: "error", msg: e.message || "Activate failed" });
    } finally {
      setLoading(false);
    }
  };

  // ✅ FIX: backend cancel needs { licenseid, companyid }
  const doCancel = async (row) => {
    try {
      setLoading(true);
      const payload = {
        licenseid: row?.licenseid,
        companyid: row?.companyid,
      };
      const res = await fetch(`${API_BASE}/lisencegen/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || data.type !== "success") {
        throw new Error(data.message || data.details || "Cancel failed");
      }

      setSnack({ open: true, type: "success", msg: data.message || "Canceled" });
      await fetchDropdowns();
    } catch (e) {
      setSnack({ open: true, type: "error", msg: e.message || "Cancel failed" });
    } finally {
      setLoading(false);
    }
  };

  const onConfirmProceed = async () => {
    const { mode, row } = confirm || {};
    closeConfirm();
    if (!row) return;

    if (mode === "activate") return doActivate(row);
    if (mode === "cancel") return doCancel(row);
  };

  // Grid Columns
  const columns = useMemo(
    () => [
      {
        field: "companyname",
        headerName: "Company",
        flex: 1.2,
        minWidth: 180,
        renderCell: (p) => (
          <Typography fontFamily="monospace" fontSize={12} noWrap fontWeight={600}>
            {p?.row?.companyname ?? "—"}
          </Typography>
        ),
      },
      {
        field: "companycode",
        headerName: "Code",
        width: 90,
        renderCell: (p) => <Chip label={p?.row?.companycode ?? "—"} size="small" variant="outlined" />,
      },

      // ✅ NEW (useful): company max OT
      {
        field: "maxothours",
        headerName: "Max OT",
        width: 105,
        type: "number",
        renderCell: (p) => {
          const v = p?.row?.maxothours;
          return <Chip label={v === null || v === undefined ? "—" : String(v)} size="small" variant="outlined" />;
        },
      },

      {
        field: "licenseid",
        headerName: "License",
        flex: 1.6,
        minWidth: 330,
        renderCell: (p) => (
          <Typography fontFamily="monospace" fontSize={12} noWrap>
            {p?.row?.licenseid ?? "—"}
          </Typography>
        ),
      },
      {
        field: "deviceid",
        headerName: "Device",
        flex: 1,
        minWidth: 180,
        renderCell: (p) =>
          p?.row?.deviceid ? (
            <Chip label={p.row.deviceid} size="small" color="info" variant="outlined" />
          ) : (
            <Chip label="Unbound" size="small" variant="outlined" />
          ),
      },
      { field: "validmonth", headerName: "Months", width: 90, type: "number" },

      // Deduction type
      {
        field: "deductiontype",
        headerName: "Deduction",
        width: 120,
        renderCell: (p) => {
          const v = String(p?.row?.deductiontype || "").trim().toUpperCase();
          if (v === "P") return <Chip label="P (%)" size="small" variant="outlined" />;
          if (v === "F") return <Chip label="F (Flat)" size="small" variant="outlined" />;
          return <Chip label="—" size="small" variant="outlined" />;
        },
      },

      // flags
      {
        field: "livenessflag",
        headerName: "Liveness",
        width: 120,
        sortable: true,
        renderCell: (p) => boolChip(!!p?.row?.livenessflag, "Yes", "No", "—", "success"),
      },
      {
        field: "inoutflag",
        headerName: "In/Out",
        width: 120,
        sortable: true,
        renderCell: (p) => boolChip(!!p?.row?.inoutflag, "Enabled", "Disabled", "—", "info"),
      },

      // ✅ NEW: nonpluckerinflag column (meaningful only if inoutflag=true)
      {
        field: "nonpluckerinflag",
        headerName: "Non-Plucker",
        width: 140,
        sortable: true,
        renderCell: (p) => {
          const row = p?.row || {};
          if (!row?.inoutflag) return <Chip label="N/A" size="small" variant="outlined" />;
          return boolChip(!!row?.nonpluckerinflag, "Yes", "No", "—", "secondary");
        },
      },

      {
        field: "fromdate_text",
        headerName: "From",
        width: 130,
        renderCell: (p) => {
          const row = p?.row || {};
          const txt =
            row.fromdate_text ?? (row.fromdate ? new Date(row.fromdate).toLocaleDateString() : null);
          return <span>{txt || "—"}</span>;
        },
      },
      {
        field: "todate_text",
        headerName: "To",
        width: 130,
        renderCell: (p) => {
          const row = p?.row || {};
          const txt =
            row.todate_text ?? (row.todate ? new Date(row.todate).toLocaleDateString() : null);
          return <span>{txt || "—"}</span>;
        },
      },
      {
        field: "activeflag",
        headerName: "Active",
        width: 110,
        renderCell: (p) =>
          p?.row?.activeflag ? (
            <Chip label="Active" color="success" size="small" />
          ) : (
            <Chip label="Inactive" color="warning" size="small" variant="outlined" />
          ),
      },
      {
        field: "status",
        headerName: "Status",
        width: 160,
        renderCell: (p) => {
          const val = p?.row?.status || "";
          const map = {
            Active: "success",
            Expired: "error",
            "Pending Activation": "info",
            Inactive: "warning",
          };
          const color = map[val] || "default";
          return (
            <Chip label={val || "—"} size="small" color={color} variant={val ? "filled" : "outlined"} />
          );
        },
      },
      { field: "daysToExpire", headerName: "Days Left", width: 110, type: "number" },

      // Actions
      {
        field: "_actions",
        headerName: "Actions",
        width: 120,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        renderCell: (p) => {
          const row = p?.row || {};
          const status = row.status;

          const canActivate = status === "Pending Activation" && !row.deviceid;
          const canCancel = !!row.deviceid || status === "Active";

          return (
            <Stack direction="row" spacing={0.5}>
              <Tooltip title={canActivate ? "Activate" : "Activate (only Pending Activation)"}>
                <span>
                  <IconButton
                    size="small"
                    disabled={!canActivate || loading}
                    onClick={() => openConfirm("activate", row)}
                  >
                    <PowerSettingsNewIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>

              <Tooltip title={canCancel ? "Cancel / Unbind" : "Cancel (only Active/Bound)"}>
                <span>
                  <IconButton
                    size="small"
                    disabled={!canCancel || loading}
                    onClick={() => openConfirm("cancel", row)}
                  >
                    <CancelIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            </Stack>
          );
        },
      },
    ],
    [loading]
  );

  // Safe rows
  const rows = useMemo(() => {
    const src = Array.isArray(licenses) ? licenses.filter(Boolean) : [];
    return src.map((r, idx) => ({ id: r.rowid ?? idx, ...r }));
  }, [licenses]);

  // Filters (company + status + deductiontype + flags + search)
  const filteredRows = useMemo(() => {
    let out = rows;

    if (companyFilter?.companyid) {
      out = out.filter((r) => r.companyid === companyFilter.companyid);
    }

    if (statusFilter?.value && statusFilter.value !== "ALL") {
      out = out.filter((r) => (r.status || "") === statusFilter.value);
    }

    if (deductionFilter?.value && deductionFilter.value !== "ALL") {
      const want = String(deductionFilter.value).trim().toUpperCase();
      out = out.filter((r) => String(r.deductiontype || "").trim().toUpperCase() === want);
    }

    if (livenessFilter?.value !== "ALL") {
      const want = livenessFilter.value === "1";
      out = out.filter((r) => !!r.livenessflag === want);
    }

    if (inOutFilter?.value !== "ALL") {
      const want = inOutFilter.value === "1";
      out = out.filter((r) => !!r.inoutflag === want);
    }

    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      out = out.filter(
        (r) =>
          (r.companyname || "").toLowerCase().includes(q) ||
          (r.companycode || "").toLowerCase().includes(q) ||
          String(r.maxothours ?? "").toLowerCase().includes(q) ||
          (r.licenseid || "").toLowerCase().includes(q) ||
          (r.deviceid || "").toLowerCase().includes(q) ||
          (r.status || "").toLowerCase().includes(q) ||
          (r.fromdate_text || "").toLowerCase().includes(q) ||
          (r.todate_text || "").toLowerCase().includes(q) ||
          (r.deductiontype || "").toLowerCase().includes(q) ||
          String(r.nonpluckerinflag ?? "").toLowerCase().includes(q)
      );
    }

    return out;
  }, [rows, companyFilter, statusFilter, deductionFilter, livenessFilter, inOutFilter, searchText]);

  /* =========================
     Export (full dataset)
     ========================= */
  const buildFilteredRowsForExport = useCallback(() => {
    const src = Array.isArray(licenses) ? licenses.filter(Boolean) : [];
    let out = src;

    if (companyFilter?.companyid) out = out.filter((r) => r.companyid === companyFilter.companyid);

    if (statusFilter?.value && statusFilter.value !== "ALL") {
      out = out.filter((r) => (r.status || "") === statusFilter.value);
    }

    if (deductionFilter?.value && deductionFilter.value !== "ALL") {
      const want = String(deductionFilter.value).trim().toUpperCase();
      out = out.filter((r) => String(r.deductiontype || "").trim().toUpperCase() === want);
    }

    if (livenessFilter?.value !== "ALL") {
      const want = livenessFilter.value === "1";
      out = out.filter((r) => !!r.livenessflag === want);
    }

    if (inOutFilter?.value !== "ALL") {
      const want = inOutFilter.value === "1";
      out = out.filter((r) => !!r.inoutflag === want);
    }

    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      out = out.filter(
        (r) =>
          (r.companyname || "").toLowerCase().includes(q) ||
          (r.companycode || "").toLowerCase().includes(q) ||
          String(r.maxothours ?? "").toLowerCase().includes(q) ||
          (r.licenseid || "").toLowerCase().includes(q) ||
          (r.deviceid || "").toLowerCase().includes(q) ||
          (r.status || "").toLowerCase().includes(q) ||
          (r.fromdate_text || "").toLowerCase().includes(q) ||
          (r.todate_text || "").toLowerCase().includes(q) ||
          (r.deductiontype || "").toLowerCase().includes(q) ||
          String(r.nonpluckerinflag ?? "").toLowerCase().includes(q)
      );
    }

    return out.map((r, idx) => ({ id: r.rowid ?? idx, ...r }));
  }, [licenses, companyFilter, statusFilter, deductionFilter, livenessFilter, inOutFilter, searchText]);

  const downloadExcel = () => {
    try {
      const exportRows = buildFilteredRowsForExport();

      const cols = [
        { key: "companyname", title: "Company" },
        { key: "companycode", title: "Code" },
        { key: "maxothours", title: "MaxOTHours" },
        { key: "licenseid", title: "License" },
        { key: "deviceid", title: "Device" },
        { key: "validmonth", title: "Months" },
        { key: "deductiontype", title: "DeductionType" },
        { key: "livenessflag", title: "Liveness" },
        { key: "inoutflag", title: "InOut" },
        { key: "nonpluckerinflag", title: "NonPluckerIn" },
        { key: "fromdate_text", title: "From" },
        { key: "todate_text", title: "To" },
        { key: "activeflag", title: "Active" },
        { key: "status", title: "Status" },
        { key: "daysToExpire", title: "Days Left" },
      ];

      const esc = (s) =>
        String(s ?? "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");

      const headerRow = `<Row>${cols
        .map((c) => `<Cell><Data ss:Type="String">${esc(c.title)}</Data></Cell>`)
        .join("")}</Row>`;

      const bodyRows = exportRows
        .map((r) => {
          const cells = cols
            .map((c) => {
              let v = r[c.key];

              if (c.key === "livenessflag" || c.key === "inoutflag" || c.key === "nonpluckerinflag") {
                v = v ? 1 : 0;
              }

              const isNum = typeof v === "number";
              return `<Cell><Data ss:Type="${isNum ? "Number" : "String"}">${isNum ? v : esc(v ?? "")}</Data></Cell>`;
            })
            .join("");
          return `<Row>${cells}</Row>`;
        })
        .join("");

      const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Worksheet ss:Name="Licenses">
    <Table>${headerRow}${bodyRows}</Table>
  </Worksheet>
</Workbook>`;

      const blob = new Blob([xml], { type: "application/vnd.ms-excel" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      // Windows-safe filename (no :)
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:]/g, "-");
      a.download = `licenses_${stamp}.xls`;

      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setSnack({ open: true, type: "error", msg: "Excel download failed" });
    }
  };

  /* =========================
     Create/Edit Company logic (maxothours added)
     ========================= */
  const resetCompanyForm = () => {
    setCompanyForm({
      companyname: "",
      companycode: "",
      gst: "",
      address1: "",
      address2: "",
      address3: "",
      maxothours: "",
    });
    setCompanyEditPick(null);
    setIsEditMode(false);
  };

  const hydrateFormFromPick = (pick) => {
    if (!pick) return resetCompanyForm();
    setCompanyForm({
      companyname: pick.companyname || "",
      companycode: pick.companycode || "",
      gst: pick.gst || "",
      address1: pick.address1 || "",
      address2: pick.address2 || "",
      address3: pick.address3 || "",
      maxothours:
        pick.maxothours === null || pick.maxothours === undefined ? "" : String(pick.maxothours),
    });
  };

  const handleCompanyPick = (_, val) => {
    setCompanyEditPick(val);
    if (val && val.companyid) {
      setIsEditMode(true);
      hydrateFormFromPick(val);
    } else {
      resetCompanyForm();
    }
  };

  const onCompanyFieldChange = (key) => (e) =>
    setCompanyForm((prev) => ({ ...prev, [key]: e.target.value }));

  const validateCompanyForm = () => {
    const { companyname, companycode, maxothours } = companyForm;

    if (!companyname?.trim()) return "Company name is required.";
    if (!companycode?.trim()) return "Company code is required.";
    if (companyname.length > 100) return "Company name must be ≤ 100 chars.";
    if (companycode.length > 100) return "Company code must be ≤ 100 chars.";
    if (companyForm.gst?.length > 100) return "GST must be ≤ 100 chars.";
    if (companyForm.address1?.length > 100) return "Address1 must be ≤ 100 chars.";
    if (companyForm.address2?.length > 100) return "Address2 must be ≤ 100 chars.";
    if (companyForm.address3?.length > 100) return "Address3 must be ≤ 100 chars.";

    // ✅ NEW: maxothours (optional)
    if (maxothours !== "" && maxothours !== null && maxothours !== undefined) {
      const n = Number(maxothours);
      if (Number.isNaN(n)) return "Max OT Hours must be a number.";
      if (n < 0 || n > 24) return "Max OT Hours must be between 0 and 24.";
    }

    return null;
  };

  const handleCompanyCreate = async (e) => {
    e.preventDefault();
    const err = validateCompanyForm();
    if (err) return setSnack({ open: true, type: "warning", msg: err });

    try {
      setLoading(true);

      const payload = {
        ...companyForm,
        // send null when empty
        maxothours:
          companyForm.maxothours === "" || companyForm.maxothours === null || companyForm.maxothours === undefined
            ? null
            : Number(companyForm.maxothours),
      };

      const res = await fetch(`${API_BASE}/company`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || data.type !== "success") throw new Error(data.message || "Create failed");
      setSnack({ open: true, type: "success", msg: data.message || "Company created" });
      resetCompanyForm();
      await fetchDropdowns();
    } catch (e1) {
      setSnack({ open: true, type: "error", msg: e1.message || "Create failed" });
    } finally {
      setLoading(false);
    }
  };

  const handleCompanyUpdate = async (e) => {
    e.preventDefault();
    if (!companyEditPick?.companyid) {
      return setSnack({ open: true, type: "warning", msg: "Pick a company to edit." });
    }
    const err = validateCompanyForm();
    if (err) return setSnack({ open: true, type: "warning", msg: err });

    try {
      setLoading(true);

      const payload = {
        ...companyForm,
        maxothours:
          companyForm.maxothours === "" || companyForm.maxothours === null || companyForm.maxothours === undefined
            ? null
            : Number(companyForm.maxothours),
      };

      const res = await fetch(`${API_BASE}/company/${companyEditPick.companyid}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || data.type !== "success") throw new Error(data.message || "Update failed");
      setSnack({ open: true, type: "success", msg: data.message || "Company updated" });
      resetCompanyForm();
      await fetchDropdowns();
    } catch (e1) {
      setSnack({ open: true, type: "error", msg: e1.message || "Update failed" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer>
      <ShellCard
        title="License Management"
        action={
          <Stack direction="row" spacing={1} alignItems="center">
            <Tooltip title="Refresh">
              <IconButton onClick={fetchDropdowns} disabled={loading}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Download Excel (Filtered)">
              <IconButton onClick={downloadExcel} disabled={loading}>
                <DownloadIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        }
      >
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{
            mb: 1.5,
            "& .MuiTab-root": {
              textTransform: "none",
              fontWeight: 700,
              minHeight: 36,
              py: 0.5,
            },
            "& .MuiTabs-flexContainer": { gap: 0.5 },
            "& .MuiTabs-indicator": { height: 3, borderRadius: 2 },
          }}
        >
          <Tab label="All Licenses" />
          <Tab label="Generate License" />
          <Tab label="Create/Edit Company" />
        </Tabs>

        {/* Tab 0: All Licenses */}
        {tab === 0 && (
          <Box>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                mb: 1,
                gap: 1,
                flexWrap: "wrap",
              }}
            >
              <Typography variant="subtitle2" color="text.secondary">
                Showing {filteredRows.length} record(s)
              </Typography>

              <Stack direction="row" spacing={1} alignItems="center" sx={{ ml: "auto" }}>
                <Autocomplete
                  options={[...companies]}
                  value={companyFilter}
                  onChange={(_, v) => setCompanyFilter(v)}
                  isOptionEqualToValue={(opt, val) => opt?.companyid === val?.companyid}
                  getOptionLabel={(o) => (o ? `${o.companyname} (${o.companycode})` : "")}
                  sx={{ width: 260 }}
                  renderInput={(params) => <TextField {...params} label="Company" size="small" />}
                />

                <Autocomplete
                  options={STATUS_OPTIONS}
                  value={statusFilter}
                  onChange={(_, v) => setStatusFilter(v || STATUS_OPTIONS[0])}
                  isOptionEqualToValue={(opt, val) => opt?.value === val?.value}
                  getOptionLabel={(o) => o.label}
                  sx={{ width: 190 }}
                  renderInput={(params) => <TextField {...params} label="Status" size="small" />}
                />

                <Autocomplete
                  options={DEDUCTION_FILTER}
                  value={deductionFilter}
                  onChange={(_, v) => setDeductionFilter(v || DEDUCTION_FILTER[0])}
                  isOptionEqualToValue={(opt, val) => opt?.value === val?.value}
                  getOptionLabel={(o) => o.label}
                  sx={{ width: 170 }}
                  renderInput={(params) => <TextField {...params} label="Deduction" size="small" />}
                />

                <Autocomplete
                  options={BOOL_FILTER}
                  value={livenessFilter}
                  onChange={(_, v) => setLivenessFilter(v || BOOL_FILTER[0])}
                  isOptionEqualToValue={(opt, val) => opt?.value === val?.value}
                  getOptionLabel={(o) => o.label}
                  sx={{ width: 150 }}
                  renderInput={(params) => <TextField {...params} label="Liveness" size="small" />}
                />
                <Autocomplete
                  options={BOOL_FILTER}
                  value={inOutFilter}
                  onChange={(_, v) => setInOutFilter(v || BOOL_FILTER[0])}
                  isOptionEqualToValue={(opt, val) => opt?.value === val?.value}
                  getOptionLabel={(o) => o.label}
                  sx={{ width: 150 }}
                  renderInput={(params) => <TextField {...params} label="In/Out" size="small" />}
                />

                <TextField
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Search text"
                  size="small"
                />
              </Stack>
            </Box>

            <Divider sx={{ mb: 1 }} />

            <div style={{ width: "100%" }}>
              <DataGrid
                rows={filteredRows}
                columns={columns}
                getRowId={(r) => r?.rowid ?? r?.id}
                density="compact"
                rowHeight={34}
                headerHeight={38}
                pageSizeOptions={[10, 25, 50, 100]}
                initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
                getRowClassName={(params) => {
                  const s = params?.row?.status;

                  if (s === "Active") return "row-active";
                  if (s === "Expired") return "row-expired";
                  if (s === "Pending Activation") return "row-pending";

                  const liv = !!params?.row?.livenessflag;
                  const io = !!params?.row?.inoutflag;
                  if (liv && io) return "row-flag-both";
                  if (liv) return "row-flag-live";
                  if (io) return "row-flag-io";

                  return "";
                }}
                sx={{
                  borderRadius: 2,
                  backgroundColor: "#fff",
                  border: (t) => `1px solid ${t.palette.divider}`,
                  "& .MuiDataGrid-columnHeaders": {
                    background: (t) => t.palette.action.hover,
                    fontWeight: 700,
                  },
                  "& .MuiDataGrid-row:hover": {
                    backgroundColor: (t) => t.palette.action.hover,
                  },

                  "& .row-active": { backgroundColor: "rgba(34,197,94,0.10)" },
                  "& .row-expired": { backgroundColor: "rgba(239,68,68,0.08)" },
                  "& .row-pending": { backgroundColor: "rgba(59,130,246,0.08)" },

                  "& .row-flag-live": { outline: "1px solid rgba(34,197,94,0.30)" },
                  "& .row-flag-io": { outline: "1px solid rgba(59,130,246,0.30)" },
                  "& .row-flag-both": { outline: "2px solid rgba(168,85,247,0.35)" },
                }}
                autoHeight
              />
            </div>
          </Box>
        )}

        {/* Tab 1: Generate License */}
        {tab === 1 && (
          <Box component="form" onSubmit={handleGenerate}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Autocomplete
                  options={companies}
                  value={companyInput}
                  onChange={(_, v) => setCompanyInput(v)}
                  isOptionEqualToValue={(opt, val) => opt?.companyid === val?.companyid}
                  getOptionLabel={(o) => (o ? `${o.companyname} (${o.companycode})` : "")}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Company"
                      placeholder="Select company"
                      required
                      size="small"
                    />
                  )}
                />

                {!!companyInput?.companyid && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                    Max OT Hours:{" "}
                    <b>{companyInput?.maxothours === null || companyInput?.maxothours === undefined ? "—" : companyInput.maxothours}</b>
                  </Typography>
                )}
              </Grid>

              <Grid item xs={6} md={3}>
                <TextField
                  label="Quantity"
                  type="number"
                  value={qty}
                  onChange={(e) => setQty(Number(e.target.value))}
                  inputProps={{ min: 1 }}
                  fullWidth
                  required
                  size="small"
                />
              </Grid>

              <Grid item xs={6} md={3}>
                <TextField
                  label="Valid (months)"
                  type="number"
                  value={validMonth}
                  onChange={(e) => setValidMonth(Number(e.target.value))}
                  inputProps={{ min: 1 }}
                  fullWidth
                  required
                  size="small"
                />
              </Grid>

              <Grid item xs={12} md={3}>
                <Autocomplete
                  options={DEDUCTION_OPTIONS}
                  value={deductionType}
                  onChange={(_, v) => setDeductionType(v || DEDUCTION_OPTIONS[0])}
                  isOptionEqualToValue={(opt, val) => opt?.value === val?.value}
                  getOptionLabel={(o) => o?.label || ""}
                  renderInput={(params) => <TextField {...params} label="Deduction Type" size="small" />}
                />
              </Grid>

              <Grid item xs={12}>
                <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                  <FormControlLabel
                    control={
                      <Switch checked={livenessFlag} onChange={(e) => setLivenessFlag(e.target.checked)} />
                    }
                    label="Liveness"
                  />

                  <FormControlLabel
                    control={<Switch checked={inOutFlag} onChange={(e) => setInOutFlag(e.target.checked)} />}
                    label="In/Out"
                  />

                  {/* ✅ NEW: nonpluckerinflag (enabled only if In/Out is enabled) */}
                  <Tooltip title={inOutFlag ? "Allowed because In/Out is enabled" : "Enable In/Out to use this flag"}>
                    <span>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={!!nonPluckerInFlag}
                            onChange={(e) => setNonPluckerInFlag(e.target.checked)}
                            disabled={!inOutFlag}
                          />
                        }
                        label="Non-Plucker In"
                      />
                    </span>
                  </Tooltip>

                  {!inOutFlag && (
                    <Chip label="Non-Plucker In requires In/Out" size="small" variant="outlined" />
                  )}
                </Stack>
              </Grid>

              <Grid item xs={12}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Button type="submit" variant="contained" size="small" disabled={loading}>
                    Generate
                  </Button>
                  {loading && <CircularProgress size={20} />}
                </Stack>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* Tab 2: Create/Edit Company */}
        {tab === 2 && (
          <Box component="form" onSubmit={isEditMode ? handleCompanyUpdate : handleCompanyCreate}>
            <Grid container spacing={2} alignItems="flex-start">
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  {isEditMode ? "Edit existing company" : "Create a new company"}
                </Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <Autocomplete
                  options={companies}
                  value={companyEditPick}
                  onChange={handleCompanyPick}
                  isOptionEqualToValue={(opt, val) => opt?.companyid === val?.companyid}
                  getOptionLabel={(o) => (o ? `${o.companyname} (${o.companycode})` : "")}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Pick existing to edit (optional)"
                      size="small"
                      placeholder="Search company"
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Stack direction="row" spacing={1}>
                  <Button variant="outlined" size="small" onClick={resetCompanyForm}>
                    New / Reset
                  </Button>
                </Stack>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  label="Company Name"
                  value={companyForm.companyname}
                  onChange={onCompanyFieldChange("companyname")}
                  required
                  fullWidth
                  size="small"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Company Code"
                  value={companyForm.companycode}
                  onChange={onCompanyFieldChange("companycode")}
                  required
                  fullWidth
                  size="small"
                />
              </Grid>

              {/* ✅ NEW: maxothours */}
              <Grid item xs={12} md={4}>
                <TextField
                  label="Max OT Hours"
                  type="number"
                  value={companyForm.maxothours}
                  onChange={onCompanyFieldChange("maxothours")}
                  fullWidth
                  size="small"
                  inputProps={{ min: 0, max: 24, step: "0.25" }}
                  placeholder="e.g. 2"
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  label="GST"
                  value={companyForm.gst}
                  onChange={onCompanyFieldChange("gst")}
                  fullWidth
                  size="small"
                />
              </Grid>
              <Grid item xs={12} md={4} />

              <Grid item xs={12} md={4}>
                <TextField
                  label="Address 1"
                  value={companyForm.address1}
                  onChange={onCompanyFieldChange("address1")}
                  fullWidth
                  size="small"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Address 2"
                  value={companyForm.address2}
                  onChange={onCompanyFieldChange("address2")}
                  fullWidth
                  size="small"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Address 3"
                  value={companyForm.address3}
                  onChange={onCompanyFieldChange("address3")}
                  fullWidth
                  size="small"
                />
              </Grid>

              <Grid item xs={12}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Button type="submit" variant="contained" size="small" disabled={loading}>
                    {isEditMode ? "Update Company" : "Create Company"}
                  </Button>
                  {loading && <CircularProgress size={20} />}
                </Stack>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* Confirm Dialog */}
        <Dialog open={confirm.open} onClose={closeConfirm} maxWidth="xs" fullWidth>
          <DialogTitle>
            {confirm.mode === "activate" ? "Activate License?" : "Cancel / Unbind License?"}
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary">
              License:{" "}
              <Typography component="span" fontFamily="monospace" fontWeight={700}>
                {confirm?.row?.licenseid || "—"}
              </Typography>
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Company:{" "}
              <Typography component="span" fontWeight={700}>
                {confirm?.row?.companyname || "—"} ({confirm?.row?.companycode || "—"})
              </Typography>
            </Typography>

            {confirm.mode === "activate" && (
              <Alert severity="info" sx={{ mt: 1 }}>
                Device ID will be generated by server automatically.
              </Alert>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={closeConfirm} disabled={loading}>
              No
            </Button>
            <Button
              onClick={onConfirmProceed}
              variant="contained"
              color={confirm.mode === "activate" ? "success" : "warning"}
              disabled={loading}
            >
              Yes
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar */}
        <Snackbar
          open={snack.open}
          autoHideDuration={3000}
          onClose={() => setSnack((s) => ({ ...s, open: false }))}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        >
          <Alert
            onClose={() => setSnack((s) => ({ ...s, open: false }))}
            severity={snack.type}
            variant="filled"
            sx={{ width: "100%" }}
          >
            {snack.msg}
          </Alert>
        </Snackbar>

        {loading && (
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 2 }}>
            <CircularProgress size={20} />
            <Typography variant="body2" color="text.secondary">
              Loading…
            </Typography>
          </Stack>
        )}
      </ShellCard>
    </PageContainer>
  );
};

export default License;
