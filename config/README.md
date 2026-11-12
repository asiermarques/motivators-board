# Your configuration

Put here the files that make the Board yours. Each file replaces the file of the same name in `config.example/`, the
Sample configuration, and everything you do not add is read from there. This folder is git-ignored upstream, except
this README; in an Adopter repository it is the folder you commit.

- `settings.yml`: the title, the logo, the footer and the Locale.
- `motivators/`: one Markdown Motivator file per Motivator, named after its Motivator key (`[a-z0-9-]+`). When this
  folder exists it is the whole set of Motivators: the sample ones are not added to it.
- `i18n/<locale>.yml`: overrides of the UI strings for the Locale. For a Locale that is not shipped (only `en` is),
  it must translate every UI string; `check` lists the ones missing.
- `theme.css`: CSS loaded after the base styles.
- Images (svg, png, jpg, jpeg, webp, gif) referenced by the settings and the Motivator files.

`npm run check` lists every problem of the Configuration; `npm run build` refuses to build until there are none.
To read the Configuration from another folder, set `MOTIVATORS_BOARD_CONFIG_DIR`.
