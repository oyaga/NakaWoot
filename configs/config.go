package configs

type Config struct {
Port string
}

func Default() Config {
return Config{Port: "8080"}
}