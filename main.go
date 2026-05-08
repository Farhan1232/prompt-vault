package main

import (
	"embed"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	app := NewApp()

	err := wails.Run(&options.App{
		Title:            "AI Prompt Manager",
		Width:            1400,
		Height:           900,
		MinWidth:         1100,
		MinHeight:        700,
		AssetServer:      &assetserver.Options{Assets: assets},
		BackgroundColour: &options.RGBA{R: 10, G: 10, B: 26, A: 1},
		OnStartup:        app.startup,
		Bind:             []interface{}{app},
		Frameless:        false,
	})

	if err != nil {
		println("Error:", err.Error())
	}
}
