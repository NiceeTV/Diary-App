import time
import os
from flask import Flask, render_template, request, jsonify
import sqlite3
import json
from datetime import datetime


app = Flask(__name__, static_folder='static', static_url_path='')
app.config['SECRET_KEY'] = os.urandom(24)


#databáza
DATABASE = 'diary.db'

#pripoj sa k db
def get_db():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row  # Umožňuje prístup podľa názvu stĺpca
    return conn

def init_db():
    """Vytvorí všetky potrebné tabuľky ak neexistujú"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Hlavná tabuľka pre denníky
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS diary_entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            datum TEXT NOT NULL,

            -- stats
            wakeup_time TEXT,        
            sleep_time TEXT,        
            screen_time INTEGER,
                
            -- moods
            rano_score INTEGER,    -- 1-5
            vecer_score INTEGER,    -- 1-5
            spanok_score INTEGER,      -- 1-5
            energia_score INTEGER,     -- 1-5
            
            -- goal
            goal TEXT,
            goal_completed INTEGER DEFAULT 0,
            goal_reason TEXT,
            goal_reason_other TEXT, -- ak bolo reason = other, tak tu je dovod

            -- jsony
            events TEXT,
            category_times TEXT,

            -- diary a reflexia
            diary TEXT,
            reflexia TEXT,

            -- metadata
            created_at TEXT,
            updated_at TEXT,
            version TEXT DEFAULT '1.0'
        )
    ''')
    
    # Indexy pre rýchle vyhľadávanie
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_date ON diary_entries(datum)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_created_at ON diary_entries(created_at)')
    
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_wakeup_time ON diary_entries(wakeup_time)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_sleep_time ON diary_entries(spanok_score)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_screen_time ON diary_entries(screen_time)')

    cursor.execute('CREATE INDEX IF NOT EXISTS idx_rano_score ON diary_entries(rano_score)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_vecer_score ON diary_entries(vecer_score)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_spanok_score ON diary_entries(spanok_score)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_energia_score ON diary_entries(energia_score)')

    # index pre goal
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_goal_completed ON diary_entries(goal_completed)')

    #search full text pre title, diary, reflexia, 
    cursor.execute('''
        CREATE VIRTUAL TABLE IF NOT EXISTS diary_entries_fts USING fts5(
            title,
            diary,
            reflexia,
            content=diary_entries,
            content_rowid=id
        )
    ''')

    #triggery na update fts
    cursor.execute('''
        CREATE TRIGGER IF NOT EXISTS diary_entries_fts_after_insert 
        AFTER INSERT ON diary_entries BEGIN
            INSERT INTO diary_entries_fts (rowid, title, diary, reflexia)
            VALUES (new.id, new.title, new.diary, new.reflexia);
        END
    ''')
    
    cursor.execute('''
        CREATE TRIGGER IF NOT EXISTS diary_entries_fts_after_update 
        AFTER UPDATE ON diary_entries BEGIN
            UPDATE diary_entries_fts 
            SET title = new.title, diary = new.diary, reflexia = new.reflexia
            WHERE rowid = new.id;
        END
    ''')
    
    cursor.execute('''
        CREATE TRIGGER IF NOT EXISTS diary_entries_fts_after_delete 
        AFTER DELETE ON diary_entries BEGIN
            DELETE FROM diary_entries_fts WHERE rowid = old.id;
        END
    ''')


    # tabuľka pre kategórie 
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            color TEXT,
            icon TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    

    # vložíme základné kategórie ak ešte neexistujú
    cursor.execute('SELECT COUNT(*) as count FROM categories')
    count = cursor.fetchone()['count']
    
    if count == 0:
        categories = [
            ('anime', '#ff6b6b', '🎬'),
            ('práca', '#4ade80', '💼'),
            ('škola', '#60a5fa', '📚'),
            ('skrol', '#fbbf24', '📱'),
            ('šport', '#f472b6', '🏃'),
            ('hry', '#a78bfa', '🎮'),
            ('other', '#9ca3af', '📌')
        ]
        cursor.executemany(
            'INSERT INTO categories (name, color, icon) VALUES (?, ?, ?)',
            categories
        )
    
    conn.commit()
    conn.close()
    print('✅ Databáza inicializovaná!')


def parse_time_to_minutes(time_str):
    """Prevedie '4:25' na minúty (265)"""
    if not time_str:
        return None
    try:
        if ':' in str(time_str):
            parts = str(time_str).split(':')
            return int(parts[0]) * 60 + int(parts[1])
        return int(time_str)
    except:
        return None


#vytvor DB
init_db()

@app.route('/')
def index():
    return render_template('index.html') #main page


@app.route('/entry_save', methods=['POST'])  # <- musí mať methods=['POST']
def save_entry():
    try:
        data = request.json
        print('📊 Prijaté dáta:', data)

        today_stats = data.get('today_stats', {}) 
        mood = data.get('mood', {}) 
        
        now = datetime.now().isoformat()
        
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO diary_entries (
                title, datum,
                wakeup_time, sleep_time, screen_time,
                rano_score, vecer_score, spanok_score, energia_score,
                goal, goal_completed, goal_reason, goal_reason_other,
                events, category_times,
                diary, reflexia,
                created_at, updated_at, version
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', 
            (
                data.get('title', 'Bez názvu'),
                data.get('date', datetime.now().strftime('%Y-%m-%d')),
                
                # Stats - jednotlivé hodnoty
                today_stats.get('wakeup_time'),
                today_stats.get('sleep_time'),
                parse_time_to_minutes(today_stats.get('screen_time')),
                
                # Mood - jednotlivé hodnoty
                int(mood.get('rano_score', 0)) if mood.get('rano_score') else None,
                int(mood.get('vecer_score', 0)) if mood.get('vecer_score') else None,
                int(mood.get('spanok_score', 0)) if mood.get('spanok_score') else None,
                int(mood.get('energia_score', 0)) if mood.get('energia_score') else None,
                
                data.get('goal', 'Žiadny cieľ'), 
                1 if data.get('goal_completed') else 0,
                data.get('goal_reason'),
                data.get('goal_reason_other'),
                
                json.dumps(data.get('events', [])),
                json.dumps(data.get('category_times', {})),
                
                data.get('diary', ''),
                data.get('reflexia', ''),
                
                data.get('created_at', now),
                data.get('updated_at', now),
                data.get('version', '1.0'),
            )
        )
        
        conn.commit()
        entry_id = cursor.lastrowid
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Denník bol úspešne uložený!',
            'id': entry_id
        }), 200
        
    except Exception as e:
        print('❌ Chyba:', str(e))
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500



@app.route('/entries', methods=['GET'])
def get_entries():
    #len názvy, completed aby som to dal do sidebaru, created_at na zoradenie
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        #vyber záznamy
        cursor.execute('''
            SELECT 
                id, 
                title, 
                datum,
                goal_completed
            FROM diary_entries 
            ORDER BY datum DESC, created_at DESC
        ''')
        
        rows = cursor.fetchall()
        conn.close()
        
        #len to čo treba na sidebar
        entries = []
        for row in rows:
            entries.append({
                'id': row['id'],
                'title': row['title'],
                'date': row['datum'],
                'goal_completed': row['goal_completed'] == 1
            })
        
        return jsonify(entries), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500



@app.route('/entry/<int:entry_id>', methods=['GET'])
def get_entry_by_id(entry_id):
    print("niekto chce id", entry_id)

    try:
        conn = get_db()
        cursor = conn.cursor()
        
        #vyber záznamy
        cursor.execute('''
            SELECT *
            FROM diary_entries 
            WHERE id = ?
        ''', (entry_id,))

        row = cursor.fetchone()
        conn.close()

        print("got this", row)
        entry = dict(row)

        return jsonify(entry), 200


    except Exception as e:
        return jsonify({'error': str(e)}), 500






if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)