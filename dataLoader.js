// dataLoader.js
class DataLoader {
    constructor() {
      this.spreadsheetId = null;
      this.apiKey = null;
    }
  
    // 設定を初期化
    initialize(spreadsheetId, apiKey) {
      this.spreadsheetId = spreadsheetId;
      this.apiKey = apiKey;
    }
  
    // Google Sheets APIからデータを読み込む
    async loadFromSpreadsheet() {
      if (!this.spreadsheetId || !this.apiKey) {
        console.error('スプレッドシートIDまたはAPIキーが設定されていません');
        return null;
      }
  
      try {
        // 人物データのシート読み込み
        const peopleResponse = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/人物?key=${this.apiKey}`
        );
        const peopleData = await peopleResponse.json();
  
        // 論考・書籍データのシート読み込み
        const worksResponse = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/論考書籍?key=${this.apiKey}`
        );
        const worksData = await worksResponse.json();
  
        // 組織データのシート読み込み
        const orgsResponse = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/組織?key=${this.apiKey}`
        );
        const orgsData = await orgsResponse.json();
  
        // データの整形
        return this.formatData(peopleData.values, worksData.values, orgsData.values);
      } catch (error) {
        console.error('スプレッドシートからのデータ読み込みエラー:', error);
        return null;
      }
    }
  
    // 読み込んだデータを整形する
    formatData(peopleValues, worksValues, orgsValues) {
      // ヘッダー行を除外してデータを処理
      const people = this.processSheetData(peopleValues, this.peopleMapper);
      const works = this.processSheetData(worksValues, this.worksMapper);
      const organizations = this.processSheetData(orgsValues, this.orgMapper);
  
      return { people, works, organizations };
    }
  
    // シートデータを処理する共通関数
    processSheetData(values, mapperFunc) {
      if (!values || values.length < 2) return [];
      
      const headers = values[0];
      return values.slice(1).map((row, index) => {
        const item = {};
        headers.forEach((header, i) => {
          item[header] = i < row.length ? row[i] : '';
        });
        item.id = index + 1; // IDを追加
        return mapperFunc(item);
      });
    }
  
    // データマッパー関数
    peopleMapper(item) {
      return {
        id: item.id,
        name: item.name || `人物${item.id}`,
        category: item.category || '',
        tags: item.tags || ''
      };
    }
  
    worksMapper(item) {
      return {
        id: item.id,
        name: item.name || `作品${item.id}`,
        type: item.type || '論考',
        year: item.year ? parseInt(item.year, 10) : null,
        tags: item.tags || '',
        description: item.description || ''
      };
    }
  
    orgMapper(item) {
      return {
        id: item.id,
        name: item.name || `組織${item.id}`,
        type: '組織',
        year: item.year ? parseInt(item.year, 10) : null,
        tags: item.tags || '',
        description: item.description || ''
      };
    }
  }
  
  // グローバルインスタンス
  const dataLoader = new DataLoader();
