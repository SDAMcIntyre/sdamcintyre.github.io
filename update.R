library(bib2academic)
bib2acad('pubs_June2019.bib', copybib = TRUE, abstract = TRUE, overwrite = TRUE)
blogdown::build_site()
blogdown::serve_site()
