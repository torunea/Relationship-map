// dataLoader.js
class DataLoader {
    constructor() {
    this.spreadsheetId = null;
    }

    // 設定を初期化
    initialize(spreadsheetId) {
    this.spreadsheetId = spreadsheetId;
    }

    // ウェブに公開されたスプレッドシートからデータを読み込む
    async loadFromSpreadsheet() {
        if (!this.spreadsheetId) {
            console.error('スプレッドシートIDが設定されていません');
            return null;
        }
        
        try {
            // 公開されたCSVリンクを直接使用
            const csvUrl = `https://docs.google.com/spreadsheets/d/e/${this.spreadsheetId}/pub?output=csv`;
            
            // 人物データのシート読み込み
            const peopleResponse = await fetch(`${csvUrl}&gid=0`); // 最初のシートを人物データとする
            const peopleCSV = await peopleResponse.text();
            const peopleData = this.parseCSV(peopleCSV);
            
            // 論考・書籍データのシート読み込み
            const worksResponse = await fetch(`${csvUrl}&gid=1`); // 2番目のシートを論考書籍とする
            const worksCSV = await worksResponse.text();
            const worksData = this.parseCSV(worksCSV);
            
            // 組織データのシート読み込み
            const orgsResponse = await fetch(`${csvUrl}&gid=2`); // 3番目のシートを組織とする
            const orgsCSV = await orgsResponse.text();
            const orgsData = this.parseCSV(orgsCSV);
            
            // データの整形
            return {
                people: this.mapPeopleData(peopleData),
                works: this.mapWorksData(worksData),
                organizations: this.mapOrgsData(orgsData)
            };
        } catch (error) {
            console.error('スプレッドシートからのデータ読み込みエラー:', error);
            return null;
        }
    }

    // CSVデータをパースする
    parseCSV(csvText) {
    // シンプルなCSVパーサー
    const lines = csvText.split('\n');
    const headers = this.parseCSVLine(lines[0]);
    
    return lines.slice(1)
        .filter(line => line.trim() !== '')
        .map((line, index) => {
        const values = this.parseCSVLine(line);
        const item = { id: index + 1 };
        
        headers.forEach((header, i) => {
            item[header.trim()] = i < values.length ? values[i].trim() : '';
        });
        
        return item;
        });
    }

    // CSVの1行をパースする（カンマ区切りと引用符を処理）
    parseCSVLine(line) {
    const result = [];
    let startPos = 0;
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        if (line[i] === '"') {
        inQuotes = !inQuotes;
        } else if (line[i] === ',' && !inQuotes) {
        result.push(line.substring(startPos, i).replace(/^"|"$/g, ''));
        startPos = i + 1;
        }
    }
    
    // 最後のフィールドを追加
    result.push(line.substring(startPos).replace(/^"|"$/g, ''));
    
    return result;
    }

    // データマッパー関数
    mapPeopleData(data) {
    return data.map(item => ({
        id: item.id,
        name: item.name || `人物${item.id}`,
        category: item.category || '',
        tags: item.tags || ''
    }));
    }

    mapWorksData(data) {
    return data.map(item => ({
        id: item.id,
        name: item.name || `作品${item.id}`,
        type: item.type || '論考',
        year: item.year ? parseInt(item.year, 10) : null,
        tags: item.tags || '',
        description: item.description || ''
    }));
    }

    mapOrgsData(data) {
    return data.map(item => ({
        id: item.id,
        name: item.name || `組織${item.id}`,
        type: '組織',
        year: item.year ? parseInt(item.year, 10) : null,
        tags: item.tags || '',
        description: item.description || ''
    }));
    }
}

// グローバルインスタンス
const dataLoader = new DataLoader();
