package main

type Collection struct {
	ID          int64  `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Color       string `json:"color"`
	Icon        string `json:"icon"`
	CreatedAt   string `json:"createdAt"`
	UpdatedAt   string `json:"updatedAt"`
	PromptCount int    `json:"promptCount"`
}

type Tag struct {
	ID    int64  `json:"id"`
	Name  string `json:"name"`
	Color string `json:"color"`
}

type Variable struct {
	ID           int64  `json:"id"`
	PromptID     int64  `json:"promptId"`
	Name         string `json:"name"`
	DefaultValue string `json:"defaultValue"`
	Description  string `json:"description"`
}

type Prompt struct {
	ID           int64      `json:"id"`
	Title        string     `json:"title"`
	Content      string     `json:"content"`
	Description  string     `json:"description"`
	CollectionID *int64     `json:"collectionId"`
	IsFavorite   bool       `json:"isFavorite"`
	IsPinned     bool       `json:"isPinned"`
	Rating       int        `json:"rating"`
	UseCount     int        `json:"useCount"`
	LastUsedAt   *string    `json:"lastUsedAt"`
	ModelHint    string     `json:"modelHint"`
	Notes        string     `json:"notes"`
	Tags         []Tag      `json:"tags"`
	Variables    []Variable `json:"variables"`
	CreatedAt    string     `json:"createdAt"`
	UpdatedAt    string     `json:"updatedAt"`
}

type PromptVersion struct {
	ID          int64  `json:"id"`
	PromptID    int64  `json:"promptId"`
	Content     string `json:"content"`
	VersionNote string `json:"versionNote"`
	CreatedAt   string `json:"createdAt"`
}

type PromptChain struct {
	ID          int64        `json:"id"`
	Name        string       `json:"name"`
	Description string       `json:"description"`
	Steps       []ChainStep  `json:"steps"`
	CreatedAt   string       `json:"createdAt"`
}

type ChainStep struct {
	ID        int64   `json:"id"`
	ChainID   int64   `json:"chainId"`
	PromptID  int64   `json:"promptId"`
	StepOrder int     `json:"stepOrder"`
	Prompt    *Prompt `json:"prompt,omitempty"`
}

type SearchFilter struct {
	Query        string  `json:"query"`
	CollectionID *int64  `json:"collectionId"`
	TagIDs       []int64 `json:"tagIds"`
	IsFavorite   *bool   `json:"isFavorite"`
	IsPinned     *bool   `json:"isPinned"`
	MinRating    int     `json:"minRating"`
	SortBy       string  `json:"sortBy"`
	SortDir      string  `json:"sortDir"`
}

type Stats struct {
	TotalPrompts      int `json:"totalPrompts"`
	TotalCollections  int `json:"totalCollections"`
	TotalTags         int `json:"totalTags"`
	TotalUses         int `json:"totalUses"`
	FavoriteCount     int `json:"favoriteCount"`
	MostUsedCount     int `json:"mostUsedCount"`
}

type ExportData struct {
	Prompts     []Prompt      `json:"prompts"`
	Collections []Collection  `json:"collections"`
	Tags        []Tag         `json:"tags"`
	Version     string        `json:"version"`
	ExportedAt  string        `json:"exportedAt"`
}
