const campus360PdfSupabase = (() => {
  const configKey = "campus360_supabase_public_config";

  const saveConfig = ({ supabaseUrl, anonKey, accessToken }) => {
    localStorage.setItem(
      configKey,
      JSON.stringify({
        supabaseUrl: supabaseUrl.replace(/\/$/, ""),
        anonKey,
        accessToken,
      }),
    );
  };

  const loadConfig = () => JSON.parse(localStorage.getItem(configKey) || "null");

  const isConfigured = () => {
    const config = loadConfig();
    return Boolean(config?.supabaseUrl && config?.anonKey && config?.accessToken);
  };

  const headers = () => {
    const config = loadConfig();
    if (!config) {
      throw new Error("Supabase config missing");
    }

    return {
      apikey: config.anonKey,
      Authorization: `Bearer ${config.accessToken}`,
      "Content-Type": "application/json",
    };
  };

  const baseUrl = () => {
    const config = loadConfig();
    if (!config?.supabaseUrl) {
      throw new Error("Supabase URL missing");
    }

    return config.supabaseUrl;
  };

  const requestJson = async (url, options = {}) => {
    const response = await fetch(url, options);
    if (!response.ok) {
      const body = await response.text();
      throw new Error(body || `Request failed with status ${response.status}`);
    }

    return response.json();
  };

  const mapAdminDocumentToDb = (documentData) => ({
    title: documentData.title,
    description: documentData.description,
    university: documentData.university,
    faculty: documentData.faculty,
    subject: documentData.subject,
    teacher: documentData.teacher || null,
    level: documentData.level,
    academic_year: documentData.academicYear,
    price_coins: Number(documentData.price || 0),
    page_count: Number(documentData.pageCount || 1),
    file_path: documentData.filePath || documentData.fileName || "pending.pdf",
    preview_path: documentData.previewPath || null,
    file_size: documentData.fileSize || null,
    status: documentData.status || "draft",
    commission_rate: Number(documentData.commissionRate || 20),
  });

  const mapDbDocumentToAdmin = (row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    university: row.university,
    faculty: row.faculty,
    subject: row.subject,
    teacher: row.teacher || "",
    level: row.level,
    academicYear: row.academic_year,
    price: row.price_coins,
    pageCount: row.page_count,
    fileName: row.file_path?.split("/").pop() || "document.pdf",
    filePath: row.file_path,
    previewPath: row.preview_path,
    fileSize: row.file_size || "PDF",
    previewPages: row.preview_path ? 1 : 0,
    rating: Number(row.rating || 0),
    sales: row.sales_count || 0,
    downloads: row.downloads_count || 0,
    uploaderName: "Admin Campus-Bordes",
    status: row.status,
    commissionRate: row.commission_rate,
    createdAt: new Date(row.created_at).toLocaleDateString("fr-FR"),
  });

  const listDocuments = async () => {
    const url = `${baseUrl()}/rest/v1/documents?select=*&order=created_at.desc`;
    const rows = await requestJson(url, { headers: headers() });
    return rows.map(mapDbDocumentToAdmin);
  };

  const createDocument = async (documentData) => {
    const url = `${baseUrl()}/rest/v1/documents?select=*`;
    const rows = await requestJson(url, {
      method: "POST",
      headers: {
        ...headers(),
        Prefer: "return=representation",
      },
      body: JSON.stringify(mapAdminDocumentToDb(documentData)),
    });

    return mapDbDocumentToAdmin(rows[0]);
  };

  const updateDocument = async (id, documentData) => {
    const url = `${baseUrl()}/rest/v1/documents?id=eq.${encodeURIComponent(id)}&select=*`;
    const rows = await requestJson(url, {
      method: "PATCH",
      headers: {
        ...headers(),
        Prefer: "return=representation",
      },
      body: JSON.stringify(mapAdminDocumentToDb(documentData)),
    });

    return mapDbDocumentToAdmin(rows[0]);
  };

  const uploadPdf = async (file, path) => {
    const config = loadConfig();
    const response = await fetch(`${baseUrl()}/storage/v1/object/documents/${path}`, {
      method: "POST",
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${config.accessToken}`,
        "Content-Type": "application/pdf",
        "x-upsert": "true",
      },
      body: file,
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(body || `Upload failed with status ${response.status}`);
    }

    return path;
  };

  const publishDocument = (id) => updateStatus(id, "published");
  const archiveDocument = (id) => updateStatus(id, "archived");
  const draftDocument = (id) => updateStatus(id, "draft");

  const updateStatus = async (id, status) => {
    const url = `${baseUrl()}/rest/v1/documents?id=eq.${encodeURIComponent(id)}&select=*`;
    const rows = await requestJson(url, {
      method: "PATCH",
      headers: {
        ...headers(),
        Prefer: "return=representation",
      },
      body: JSON.stringify({ status }),
    });

    return mapDbDocumentToAdmin(rows[0]);
  };

  return {
    saveConfig,
    loadConfig,
    isConfigured,
    listDocuments,
    createDocument,
    updateDocument,
    uploadPdf,
    publishDocument,
    archiveDocument,
    draftDocument,
  };
})();
