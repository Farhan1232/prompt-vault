package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"
	"time"
)

type App struct {
	ctx context.Context
}

func NewApp() *App {
	return &App{}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	if err := initDB(); err != nil {
		fmt.Println("DB init error:", err)
	}
}

// ─── Collections ────────────────────────────────────────────────────────────

func (a *App) GetCollections() ([]Collection, error) {
	rows, err := db.Query(`
		SELECT c.id, c.name, c.description, c.color, c.icon, c.created_at, c.updated_at,
		       COUNT(p.id) as prompt_count
		FROM collections c
		LEFT JOIN prompts p ON p.collection_id = c.id
		GROUP BY c.id
		ORDER BY c.name ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var collections []Collection
	for rows.Next() {
		var c Collection
		if err := rows.Scan(&c.ID, &c.Name, &c.Description, &c.Color, &c.Icon,
			&c.CreatedAt, &c.UpdatedAt, &c.PromptCount); err != nil {
			return nil, err
		}
		collections = append(collections, c)
	}
	return collections, nil
}

func (a *App) CreateCollection(name, description, color, icon string) (*Collection, error) {
	res, err := db.Exec(
		`INSERT INTO collections (name, description, color, icon) VALUES (?, ?, ?, ?)`,
		name, description, color, icon,
	)
	if err != nil {
		return nil, err
	}
	id, _ := res.LastInsertId()
	return &Collection{ID: id, Name: name, Description: description, Color: color, Icon: icon}, nil
}

func (a *App) UpdateCollection(id int64, name, description, color, icon string) error {
	_, err := db.Exec(
		`UPDATE collections SET name=?, description=?, color=?, icon=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
		name, description, color, icon, id,
	)
	return err
}

func (a *App) DeleteCollection(id int64) error {
	_, err := db.Exec(`DELETE FROM collections WHERE id=?`, id)
	return err
}

// ─── Tags ────────────────────────────────────────────────────────────────────

func (a *App) GetTags() ([]Tag, error) {
	rows, err := db.Query(`SELECT id, name, color FROM tags ORDER BY name ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tags []Tag
	for rows.Next() {
		var t Tag
		if err := rows.Scan(&t.ID, &t.Name, &t.Color); err != nil {
			return nil, err
		}
		tags = append(tags, t)
	}
	return tags, nil
}

func (a *App) CreateTag(name, color string) (*Tag, error) {
	res, err := db.Exec(`INSERT OR IGNORE INTO tags (name, color) VALUES (?, ?)`, name, color)
	if err != nil {
		return nil, err
	}
	id, _ := res.LastInsertId()
	if id == 0 {
		var t Tag
		err = db.QueryRow(`SELECT id, name, color FROM tags WHERE name=?`, name).Scan(&t.ID, &t.Name, &t.Color)
		return &t, err
	}
	return &Tag{ID: id, Name: name, Color: color}, nil
}

func (a *App) DeleteTag(id int64) error {
	_, err := db.Exec(`DELETE FROM tags WHERE id=?`, id)
	return err
}

// ─── Prompts ─────────────────────────────────────────────────────────────────

func (a *App) GetPrompts(filterJSON string) ([]Prompt, error) {
	var filter SearchFilter
	if filterJSON != "" {
		if err := json.Unmarshal([]byte(filterJSON), &filter); err != nil {
			return nil, err
		}
	}

	query := `
		SELECT DISTINCT p.id, p.title, p.content, p.description,
		       p.collection_id, p.is_favorite, p.is_pinned, p.rating,
		       p.use_count, p.last_used_at, p.model_hint, p.notes,
		       p.created_at, p.updated_at
		FROM prompts p
	`

	var conditions []string
	var args []interface{}

	if len(filter.TagIDs) > 0 {
		query += ` JOIN prompt_tags pt ON pt.prompt_id = p.id`
		placeholders := make([]string, len(filter.TagIDs))
		for i, tid := range filter.TagIDs {
			placeholders[i] = "?"
			args = append(args, tid)
		}
		conditions = append(conditions, fmt.Sprintf("pt.tag_id IN (%s)", strings.Join(placeholders, ",")))
	}

	if filter.Query != "" {
		conditions = append(conditions, `(p.title LIKE ? OR p.content LIKE ? OR p.description LIKE ?)`)
		q := "%" + filter.Query + "%"
		args = append(args, q, q, q)
	}
	if filter.CollectionID != nil {
		conditions = append(conditions, `p.collection_id = ?`)
		args = append(args, *filter.CollectionID)
	}
	if filter.IsFavorite != nil && *filter.IsFavorite {
		conditions = append(conditions, `p.is_favorite = 1`)
	}
	if filter.IsPinned != nil && *filter.IsPinned {
		conditions = append(conditions, `p.is_pinned = 1`)
	}
	if filter.MinRating > 0 {
		conditions = append(conditions, `p.rating >= ?`)
		args = append(args, filter.MinRating)
	}

	if len(conditions) > 0 {
		query += " WHERE " + strings.Join(conditions, " AND ")
	}

	sortBy := "p.updated_at"
	sortDir := "DESC"
	switch filter.SortBy {
	case "title":
		sortBy = "p.title"
	case "use_count":
		sortBy = "p.use_count"
	case "rating":
		sortBy = "p.rating"
	case "created_at":
		sortBy = "p.created_at"
	}
	if filter.SortDir == "ASC" {
		sortDir = "ASC"
	}

	query += fmt.Sprintf(` ORDER BY p.is_pinned DESC, %s %s`, sortBy, sortDir)

	rows, err := db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var prompts []Prompt
	for rows.Next() {
		p, err := scanPrompt(rows)
		if err != nil {
			return nil, err
		}
		p.Tags, _ = getPromptTags(p.ID)
		p.Variables, _ = getPromptVariables(p.ID)
		prompts = append(prompts, *p)
	}
	return prompts, nil
}

func (a *App) GetPrompt(id int64) (*Prompt, error) {
	row := db.QueryRow(`
		SELECT id, title, content, description, collection_id, is_favorite, is_pinned,
		       rating, use_count, last_used_at, model_hint, notes, created_at, updated_at
		FROM prompts WHERE id=?`, id)
	p, err := scanPrompt(row)
	if err != nil {
		return nil, err
	}
	p.Tags, _ = getPromptTags(p.ID)
	p.Variables, _ = getPromptVariables(p.ID)
	return p, nil
}

func (a *App) CreatePrompt(title, content, description string, collectionID *int64, modelHint, notes string, tagIDs []int64) (*Prompt, error) {
	res, err := db.Exec(
		`INSERT INTO prompts (title, content, description, collection_id, model_hint, notes) VALUES (?, ?, ?, ?, ?, ?)`,
		title, content, description, collectionID, modelHint, notes,
	)
	if err != nil {
		return nil, err
	}
	id, _ := res.LastInsertId()

	if err := setPromptTags(id, tagIDs); err != nil {
		return nil, err
	}

	db.Exec(`INSERT INTO prompt_versions (prompt_id, content, version_note) VALUES (?, ?, ?)`,
		id, content, "Initial version")

	return a.GetPrompt(id)
}

func (a *App) UpdatePrompt(id int64, title, content, description string, collectionID *int64, modelHint, notes string, tagIDs []int64, versionNote string) error {
	var old string
	db.QueryRow(`SELECT content FROM prompts WHERE id=?`, id).Scan(&old)
	if old != content {
		note := versionNote
		if note == "" {
			note = "Updated " + time.Now().Format("Jan 02, 15:04")
		}
		db.Exec(`INSERT INTO prompt_versions (prompt_id, content, version_note) VALUES (?, ?, ?)`, id, old, note)
	}

	_, err := db.Exec(
		`UPDATE prompts SET title=?, content=?, description=?, collection_id=?, model_hint=?, notes=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
		title, content, description, collectionID, modelHint, notes, id,
	)
	if err != nil {
		return err
	}
	return setPromptTags(id, tagIDs)
}

func (a *App) DeletePrompt(id int64) error {
	_, err := db.Exec(`DELETE FROM prompts WHERE id=?`, id)
	return err
}

func (a *App) ToggleFavorite(id int64) error {
	_, err := db.Exec(`UPDATE prompts SET is_favorite = NOT is_favorite, updated_at=CURRENT_TIMESTAMP WHERE id=?`, id)
	return err
}

func (a *App) TogglePin(id int64) error {
	_, err := db.Exec(`UPDATE prompts SET is_pinned = NOT is_pinned, updated_at=CURRENT_TIMESTAMP WHERE id=?`, id)
	return err
}

func (a *App) SetRating(id int64, rating int) error {
	_, err := db.Exec(`UPDATE prompts SET rating=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`, rating, id)
	return err
}

func (a *App) RecordUse(id int64) error {
	_, err := db.Exec(`UPDATE prompts SET use_count=use_count+1, last_used_at=CURRENT_TIMESTAMP WHERE id=?`, id)
	return err
}

// ─── Variables ───────────────────────────────────────────────────────────────

func (a *App) SaveVariables(promptID int64, vars []Variable) error {
	db.Exec(`DELETE FROM variables WHERE prompt_id=?`, promptID)
	for _, v := range vars {
		db.Exec(`INSERT INTO variables (prompt_id, name, default_value, description) VALUES (?, ?, ?, ?)`,
			promptID, v.Name, v.DefaultValue, v.Description)
	}
	return nil
}

func (a *App) RenderPrompt(id int64, values map[string]string) (string, error) {
	var content string
	if err := db.QueryRow(`SELECT content FROM prompts WHERE id=?`, id).Scan(&content); err != nil {
		return "", err
	}
	for k, v := range values {
		content = strings.ReplaceAll(content, "{{"+k+"}}", v)
	}
	a.RecordUse(id)
	return content, nil
}

// ─── Versions ────────────────────────────────────────────────────────────────

func (a *App) GetVersions(promptID int64) ([]PromptVersion, error) {
	rows, err := db.Query(`
		SELECT id, prompt_id, content, version_note, created_at
		FROM prompt_versions WHERE prompt_id=? ORDER BY created_at DESC`, promptID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var versions []PromptVersion
	for rows.Next() {
		var v PromptVersion
		if err := rows.Scan(&v.ID, &v.PromptID, &v.Content, &v.VersionNote, &v.CreatedAt); err != nil {
			return nil, err
		}
		versions = append(versions, v)
	}
	return versions, nil
}

func (a *App) RestoreVersion(promptID, versionID int64) error {
	var content string
	if err := db.QueryRow(`SELECT content FROM prompt_versions WHERE id=? AND prompt_id=?`, versionID, promptID).Scan(&content); err != nil {
		return err
	}
	_, err := db.Exec(`UPDATE prompts SET content=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`, content, promptID)
	return err
}

// ─── Chains ──────────────────────────────────────────────────────────────────

func (a *App) GetChains() ([]PromptChain, error) {
	rows, err := db.Query(`SELECT id, name, description, created_at FROM prompt_chains ORDER BY name ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var chains []PromptChain
	for rows.Next() {
		var c PromptChain
		rows.Scan(&c.ID, &c.Name, &c.Description, &c.CreatedAt)
		c.Steps, _ = getChainSteps(c.ID)
		chains = append(chains, c)
	}
	return chains, nil
}

func (a *App) CreateChain(name, description string, promptIDs []int64) (*PromptChain, error) {
	res, err := db.Exec(`INSERT INTO prompt_chains (name, description) VALUES (?, ?)`, name, description)
	if err != nil {
		return nil, err
	}
	id, _ := res.LastInsertId()
	for i, pid := range promptIDs {
		db.Exec(`INSERT INTO chain_steps (chain_id, prompt_id, step_order) VALUES (?, ?, ?)`, id, pid, i+1)
	}
	return &PromptChain{ID: id, Name: name, Description: description}, nil
}

func (a *App) DeleteChain(id int64) error {
	_, err := db.Exec(`DELETE FROM prompt_chains WHERE id=?`, id)
	return err
}

// ─── Stats ───────────────────────────────────────────────────────────────────

func (a *App) GetStats() (*Stats, error) {
	s := &Stats{}
	db.QueryRow(`SELECT COUNT(*) FROM prompts`).Scan(&s.TotalPrompts)
	db.QueryRow(`SELECT COUNT(*) FROM collections`).Scan(&s.TotalCollections)
	db.QueryRow(`SELECT COUNT(*) FROM tags`).Scan(&s.TotalTags)
	db.QueryRow(`SELECT COALESCE(SUM(use_count),0) FROM prompts`).Scan(&s.TotalUses)
	db.QueryRow(`SELECT COUNT(*) FROM prompts WHERE is_favorite=1`).Scan(&s.FavoriteCount)
	db.QueryRow(`SELECT COALESCE(MAX(use_count),0) FROM prompts`).Scan(&s.MostUsedCount)
	return s, nil
}

// ─── Export / Import ─────────────────────────────────────────────────────────

func (a *App) ExportData() (string, error) {
	prompts, _ := a.GetPrompts("")
	collections, _ := a.GetCollections()
	tags, _ := a.GetTags()

	data := ExportData{
		Prompts:     prompts,
		Collections: collections,
		Tags:        tags,
		Version:     "1.0",
		ExportedAt:  time.Now().Format(time.RFC3339),
	}
	b, err := json.MarshalIndent(data, "", "  ")
	return string(b), err
}

func (a *App) ImportData(jsonStr string) error {
	var data ExportData
	if err := json.Unmarshal([]byte(jsonStr), &data); err != nil {
		return err
	}

	collMap := map[int64]int64{}
	for _, c := range data.Collections {
		res, err := db.Exec(`INSERT INTO collections (name, description, color, icon) VALUES (?, ?, ?, ?)`,
			c.Name, c.Description, c.Color, c.Icon)
		if err == nil {
			newID, _ := res.LastInsertId()
			collMap[c.ID] = newID
		}
	}

	tagMap := map[int64]int64{}
	for _, t := range data.Tags {
		tag, err := a.CreateTag(t.Name, t.Color)
		if err == nil {
			tagMap[t.ID] = tag.ID
		}
	}

	for _, p := range data.Prompts {
		var collID *int64
		if p.CollectionID != nil {
			if newID, ok := collMap[*p.CollectionID]; ok {
				collID = &newID
			}
		}
		tagIDs := []int64{}
		for _, t := range p.Tags {
			if newID, ok := tagMap[t.ID]; ok {
				tagIDs = append(tagIDs, newID)
			}
		}
		a.CreatePrompt(p.Title, p.Content, p.Description, collID, p.ModelHint, p.Notes, tagIDs)
	}
	return nil
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

type scanner interface {
	Scan(dest ...interface{}) error
}

func scanPrompt(row scanner) (*Prompt, error) {
	var p Prompt
	var collID sql.NullInt64
	var lastUsed sql.NullString
	err := row.Scan(
		&p.ID, &p.Title, &p.Content, &p.Description,
		&collID, &p.IsFavorite, &p.IsPinned,
		&p.Rating, &p.UseCount, &lastUsed,
		&p.ModelHint, &p.Notes, &p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	if collID.Valid {
		p.CollectionID = &collID.Int64
	}
	if lastUsed.Valid {
		p.LastUsedAt = &lastUsed.String
	}
	return &p, nil
}

func getPromptTags(promptID int64) ([]Tag, error) {
	rows, err := db.Query(`
		SELECT t.id, t.name, t.color FROM tags t
		JOIN prompt_tags pt ON pt.tag_id = t.id
		WHERE pt.prompt_id=?`, promptID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var tags []Tag
	for rows.Next() {
		var t Tag
		rows.Scan(&t.ID, &t.Name, &t.Color)
		tags = append(tags, t)
	}
	return tags, nil
}

func getPromptVariables(promptID int64) ([]Variable, error) {
	rows, err := db.Query(`SELECT id, prompt_id, name, default_value, description FROM variables WHERE prompt_id=?`, promptID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var vars []Variable
	for rows.Next() {
		var v Variable
		rows.Scan(&v.ID, &v.PromptID, &v.Name, &v.DefaultValue, &v.Description)
		vars = append(vars, v)
	}
	return vars, nil
}

func setPromptTags(promptID int64, tagIDs []int64) error {
	db.Exec(`DELETE FROM prompt_tags WHERE prompt_id=?`, promptID)
	for _, tid := range tagIDs {
		db.Exec(`INSERT OR IGNORE INTO prompt_tags (prompt_id, tag_id) VALUES (?, ?)`, promptID, tid)
	}
	return nil
}

func getChainSteps(chainID int64) ([]ChainStep, error) {
	rows, err := db.Query(`
		SELECT cs.id, cs.chain_id, cs.prompt_id, cs.step_order
		FROM chain_steps cs WHERE cs.chain_id=? ORDER BY cs.step_order ASC`, chainID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var steps []ChainStep
	for rows.Next() {
		var s ChainStep
		rows.Scan(&s.ID, &s.ChainID, &s.PromptID, &s.StepOrder)
		steps = append(steps, s)
	}
	return steps, nil
}
