export const SHEETDB_API_URL = import.meta.env.VITE_SHEETDB_API_URL || '';

export const getNextFolio = async (): Promise<string> => {
  try {
    const data = await sheetDb.get('pedido');
    if (!data || !Array.isArray(data) || data.length === 0) {
      return 'FDN-0001';
    }

    let maxNum = 0;
    for (const row of data) {
      if (row.folio && row.folio.startsWith('FDN-')) {
        const numPart = row.folio.replace('FDN-', '');
        const num = parseInt(numPart, 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    }

    const nextNum = maxNum + 1;
    return `FDN-${nextNum.toString().padStart(4, '0')}`;
  } catch (error) {
    console.error("Error fetching for next folio:", error);
    // Fallback if we can't fetch, use a timestamp to avoid collision
    return `FDN-${Date.now().toString().slice(-4)}`;
  }
};

export const sheetDb = {
  async get(sheet: string, query?: Record<string, string>) {
    if (!SHEETDB_API_URL) throw new Error("VITE_SHEETDB_API_URL no está configurada. Por favor, añádela en los Settings.");
    let url = `${SHEETDB_API_URL}?sheet=${sheet}`;
    if (query) {
      url = `${SHEETDB_API_URL}/search?sheet=${sheet}`;
      const params = new URLSearchParams(query);
      url += `&${params.toString()}`;
    }
    const response = await fetch(url);
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Error fetching from ${sheet}: ${response.status} ${text}`);
    }
    return response.json();
  },

  async insert(sheet: string, data: any) {
    if (!SHEETDB_API_URL) throw new Error("VITE_SHEETDB_API_URL no está configurada. Por favor, añádela en los Settings.");
    const url = `${SHEETDB_API_URL}?sheet=${sheet}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ data: [data] }) // SheetDB expects an array inside data for best compatibility
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Error inserting into ${sheet}: ${response.status} ${text}`);
    }
    return response.json();
  },

  async update(sheet: string, columnName: string, value: string, data: any) {
    if (!SHEETDB_API_URL) throw new Error("VITE_SHEETDB_API_URL no está configurada. Por favor, añádela en los Settings.");
    const url = `${SHEETDB_API_URL}/${columnName}/${value}?sheet=${sheet}`;
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ data })
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Error updating ${sheet}: ${response.status} ${text}`);
    }
    return response.json();
  },

  async delete(sheet: string, columnName: string, value: string) {
    if (!SHEETDB_API_URL) throw new Error("VITE_SHEETDB_API_URL no está configurada. Por favor, añádela en los Settings.");
    const url = `${SHEETDB_API_URL}/${columnName}/${value}?sheet=${sheet}`;
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Error deleting from ${sheet}: ${response.status} ${text}`);
    }
    return response.json();
  }
};
